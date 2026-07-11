import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import { sha256Hex } from '../utils/crypto.util.js';
import { VERIFIER_TIER_LIMITS } from '../../config/verifier-rate-limits.constants.js';
import type { VerifierKeyTier } from '../../generated/prisma/enums.js';

const API_KEY_HEADER = 'x-api-key';

export interface RequestApiKey {
  id: string;
  userId: string;
  tier: VerifierKeyTier;
}

// Authenticates the Bulk Verification API via an `X-API-Key` header instead of a JWT (this route is `@Public()` at the JwtAuthGuard level - see VerificationController). Also enforces the per-tier throughput limit (R6) since the tier is only known once the key is resolved here; a single in-memory sliding window is proportionate for a single-instance deployment - move to Redis if this ever runs behind multiple workers.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly windows = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { apiKey?: RequestApiKey }>();
    const raw = req.headers[API_KEY_HEADER];
    if (!raw || Array.isArray(raw)) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    const key = await this.prisma.verifierApiKey.findUnique({
      where: { apiKeyHash: sha256Hex(raw) },
    });
    if (
      !key ||
      key.status !== 'ACTIVE' ||
      (key.expiresAt && key.expiresAt < new Date())
    ) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    this.checkRateLimit(key.id, key.tier);

    void this.prisma.verifierApiKey
      .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    req.apiKey = { id: key.id, userId: key.userId, tier: key.tier };
    return true;
  }

  private checkRateLimit(keyId: string, tier: VerifierKeyTier): void {
    const { limit, windowMs } = VERIFIER_TIER_LIMITS[tier];
    const now = Date.now();
    const bucket = this.windows.get(keyId);
    if (!bucket || bucket.resetAt <= now) {
      this.windows.set(keyId, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (bucket.count >= limit) {
      throw new HttpException(
        `Rate limit exceeded for this API key's ${tier} tier`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    bucket.count += 1;
  }
}
