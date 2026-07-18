import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service.js';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Two requests racing on the same refresh cookie (multiple tabs open at once) can both read the token before either has rotated it. Tolerate reuse within this window by following the rotation chain instead of rejecting the loser outright and forcing a spurious logout.
const REUSE_GRACE_MS = 10 * 1000;

export interface TokenContext {
  ip?: string;
  userAgent?: string;
}

// Access tokens are stateless RS256 JWTs (15-min). Refresh tokens are opaque random strings; only their SHA-256 hash is stored, and they rotate on every use.
@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  issueAccessToken(userId: string, email: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId, email });
  }

  async issueRefreshToken(userId: string, ctx: TokenContext): Promise<string> {
    const raw = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(raw),
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return raw;
  }

  async rotate(
    rawToken: string,
    ctx: TokenContext,
  ): Promise<{ userId: string; email: string; refreshToken: string } | null> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
      include: { user: { select: { email: true, isActive: true } } },
    });
    if (!record || record.expiresAt < new Date() || !record.user.isActive) {
      return null;
    }
    if (record.revokedAt) {
      // Already rotated by a concurrent request. If it happened moments ago, follow the chain to whichever token replaced it instead of failing the loser.
      if (Date.now() - record.revokedAt.getTime() > REUSE_GRACE_MS) return null;
      const successor = await this.prisma.refreshToken.findFirst({
        where: {
          userId: record.userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          issuedAt: { gte: record.revokedAt },
        },
        orderBy: { issuedAt: 'desc' },
      });
      if (!successor) return null;
      return this.rotateRecord(
        { id: successor.id, userId: successor.userId },
        record.user.email,
        ctx,
      );
    }
    return this.rotateRecord(
      { id: record.id, userId: record.userId },
      record.user.email,
      ctx,
    );
  }

  private async rotateRecord(
    record: { id: string; userId: string },
    email: string,
    ctx: TokenContext,
  ): Promise<{ userId: string; email: string; refreshToken: string }> {
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    const refreshToken = await this.issueRefreshToken(record.userId, ctx);
    return { userId: record.userId, email, refreshToken };
  }

  async revoke(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
