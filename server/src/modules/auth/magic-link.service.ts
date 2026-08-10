import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailService } from '../../services/email/email.service.js';
import type { MagicLinkPurpose } from '../../generated/prisma/enums.js';

const TTL_MS = 15 * 60 * 1000;

// Client route the emailed token lands on, per purpose. Sign-in and manager-sign both
// complete on /auth/magic; a reset link must instead open the form that collects the
// new password, so it must never be sent to the sign-in exchange.
const LINK: Record<
  MagicLinkPurpose,
  { path: string; subject: string; intro: string }
> = {
  EMAIL_VERIFY: {
    path: '/auth/magic',
    subject: 'Your CareerVault sign-in link',
    intro: 'Use this link to sign in',
  },
  MANAGER_SIGN: {
    path: '/auth/magic',
    subject: 'Your CareerVault sign-in link',
    intro: 'Use this link to sign in',
  },
  PASSWORD_RESET: {
    path: '/auth/reset-password',
    subject: 'Reset your CareerVault password',
    intro: 'Use this link to choose a new password',
  },
};

// Single-use, 15-minute magic links. Only the token hash is stored; the raw token
// travels by email and is consumed (marked used) on verification.
@Injectable()
export class MagicLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async request(
    email: string,
    purpose: MagicLinkPurpose,
    documentId?: string,
  ): Promise<void> {
    const raw = randomBytes(32).toString('hex');
    await this.prisma.magicLink.create({
      data: {
        email,
        tokenHash: this.hash(raw),
        purpose,
        documentId,
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    });
    const base =
      this.config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173';
    const { path, subject, intro } = LINK[purpose];
    const link = `${base}${path}?token=${raw}`;
    await this.email.send({
      to: email,
      subject,
      html: `${intro} (valid 15 minutes): ${link}`,
    });
  }

  // expectedPurpose prevents cross-purpose replay — e.g. a MANAGER_SIGN link (sent to
  // a manager to sign a specific document) must never be usable to mint a login session.
  async verifyAndConsume(
    token: string,
    expectedPurpose: MagicLinkPurpose,
  ): Promise<{ email: string; documentId: string | null }> {
    const record = await this.prisma.magicLink.findUnique({
      where: { tokenHash: this.hash(token) },
    });
    if (
      !record ||
      record.usedAt ||
      record.expiresAt < new Date() ||
      record.purpose !== expectedPurpose
    ) {
      throw new UnauthorizedException('Invalid or expired link');
    }
    await this.prisma.magicLink.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return { email: record.email, documentId: record.documentId };
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
