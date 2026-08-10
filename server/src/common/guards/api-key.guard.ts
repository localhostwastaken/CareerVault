import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import { sha256Hex } from '../utils/crypto.util.js';
import {
  VERIFIER_MONTHLY_REQUEST_CAP,
  VERIFIER_TIER_LIMITS,
} from '../../config/verifier-rate-limits.constants.js';
import type {
  SubscriptionTier,
  VerifierKeyTier,
} from '../../generated/prisma/enums.js';

const API_KEY_HEADER = 'x-api-key';

// A verifier key's tier maps 1:1 to the subscription tier that gates it (R6).
const REQUIRED_SUBSCRIPTION_TIER: Record<VerifierKeyTier, SubscriptionTier> = {
  BASIC: 'VERIFIER_BASIC',
  ENTERPRISE: 'VERIFIER_ENTERPRISE',
};

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

    // Entitlement must be *live*, not merely the key: an ACTIVE key whose owning
    // subscription has been cancelled or has lapsed is dead. Without this a $49 key
    // outlived the plan that paid for it forever (R6 gating).
    await this.assertLiveEntitlement(key.userId, key.tier);

    // Per-minute throughput (R6). Rejected calls do not count against the monthly quota.
    this.checkRateLimit(key.id, key.tier);

    // Monthly request quota (R6). Also refreshes lastUsedAt in the same write.
    await this.enforceMonthlyQuota(key);

    req.apiKey = { id: key.id, userId: key.userId, tier: key.tier };
    return true;
  }

  // Rejects unless the key owner holds an ACTIVE subscription of the key's tier whose
  // billing period has not lapsed. Mirrors the "live subscription" predicate used by
  // SubscriptionService.me / VerifierKeyService.create (null period = perpetual/local).
  private async assertLiveEntitlement(
    userId: string,
    tier: VerifierKeyTier,
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        tier: REQUIRED_SUBSCRIPTION_TIER[tier],
        status: 'ACTIVE',
        OR: [
          { currentPeriodEnd: null },
          { currentPeriodEnd: { gt: new Date() } },
        ],
      },
      select: { id: true },
    });
    if (!subscription) {
      throw new ForbiddenException(
        'API key entitlement has lapsed: an active verifier subscription is required to use this key',
      );
    }
  }

  // Enforces the per-key monthly request cap with a single primary-key update. At a window
  // boundary the counter resets to this request (1); otherwise it increments. Slight
  // overcount is possible under concurrency, which is acceptable for a single instance
  // (the per-minute window above is likewise in-memory).
  private async enforceMonthlyQuota(key: {
    id: string;
    tier: VerifierKeyTier;
    monthlyUsageCount: number;
    usageResetAt: Date | null;
  }): Promise<void> {
    const cap = VERIFIER_MONTHLY_REQUEST_CAP[key.tier];
    const now = new Date();
    const windowExpired = !key.usageResetAt || key.usageResetAt <= now;
    const used = windowExpired ? 0 : key.monthlyUsageCount;

    if (used >= cap) {
      throw new HttpException(
        `Monthly quota exceeded: ${cap} verification API requests / month for this ${key.tier} key. Quota resets ${startOfNextMonth(now).toISOString()}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.prisma.verifierApiKey.update({
      where: { id: key.id },
      data: windowExpired
        ? {
            monthlyUsageCount: 1,
            usageResetAt: startOfNextMonth(now),
            lastUsedAt: now,
          }
        : { monthlyUsageCount: { increment: 1 }, lastUsedAt: now },
    });
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

// UTC start of the month after `now`; handles the December → January rollover.
function startOfNextMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}
