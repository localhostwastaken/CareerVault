import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';

// Subscription lifecycle housekeeping (R5: user subscriptions are the Stripe-billed tier).
// Without this, an ACTIVE row whose currentPeriodEnd has passed stays ACTIVE forever and
// SubscriptionStatus.EXPIRED is never written, so entitlement never lapses.
//
// Scope: the expiry side only. Renewal (extending currentPeriodEnd on a successful
// recurring charge) must come from the real PaymentService adapter / Stripe webhooks —
// this job must never renew or charge, and it deliberately leaves rows that Stripe still
// considers current alone by keying strictly off the stored currentPeriodEnd.
//
// WORKER-gated and idempotent: each step re-filters on the state it is leaving, so a
// repeat run (or a run racing the retention cron) is a no-op.
@Injectable()
export class SubscriptionExpiryCron {
  private readonly logger = new Logger(SubscriptionExpiryCron.name);
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>('WORKER') ?? false;
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDaily() {
    if (!this.enabled) return;
    await this.expireSubscriptions().catch((e) =>
      this.logger.error(`expireSubscriptions: ${e}`),
    );
  }

  // Rows with a null currentPeriodEnd are untracked/perpetual and are left untouched.
  // Subscription has no dedicated expiredAt column — currentPeriodEnd already records the
  // instant entitlement lapsed, and cancelledAt is reserved for user-initiated cancels.
  private async expireSubscriptions() {
    // One cutoff for both queries so the update can't catch a row the scan missed and
    // revoke keys for a user we never counted.
    const now = new Date();
    const lapsed = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', currentPeriodEnd: { lt: now } },
      select: { userId: true },
    });
    if (lapsed.length === 0) return;

    const userIds = [...new Set(lapsed.map((s) => s.userId))];
    const expired = await this.prisma.subscription.updateMany({
      where: { status: 'ACTIVE', currentPeriodEnd: { lt: now } },
      data: { status: 'EXPIRED' },
    });

    // An expired plan must revoke the verifier API keys it gated, exactly as cancelling
    // does (R6) - a key must never outlive the subscription that paid for it. Only users
    // left with no remaining ACTIVE subscription lose their keys, so a holder on a second
    // active plan keeps working.
    const stillEntitled = await this.prisma.subscription.findMany({
      where: { userId: { in: userIds }, status: 'ACTIVE' },
      select: { userId: true },
    });
    const entitled = new Set(stillEntitled.map((s) => s.userId));
    const toRevoke = userIds.filter((id) => !entitled.has(id));

    let revokedCount = 0;
    if (toRevoke.length > 0) {
      const revoked = await this.prisma.verifierApiKey.updateMany({
        where: { userId: { in: toRevoke }, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
      revokedCount = revoked.count;
    }

    this.logger.log(
      `Expired ${expired.count} subscription(s) across ${userIds.length} user(s); ` +
        `revoked ${revokedCount} verifier API key(s)`,
    );
  }
}
