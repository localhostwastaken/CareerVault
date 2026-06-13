import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service.js';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface TokenContext {
  ip?: string;
  userAgent?: string;
}

// Access tokens are stateless RS256 JWTs (15-min). Refresh tokens are opaque random
// strings; only their SHA-256 hash is stored, and they rotate on every use.
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
    if (
      !record ||
      record.revokedAt ||
      record.expiresAt < new Date() ||
      !record.user.isActive
    ) {
      return null;
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    const refreshToken = await this.issueRefreshToken(record.userId, ctx);
    return { userId: record.userId, email: record.user.email, refreshToken };
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
