import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  PaymentsService,
  type CheckoutResult,
} from '../payment/payments.service.js';
import {
  ISSUER_VERIFIER_DISCOUNT,
  PLANS,
  PLAN_BY_TIER,
  round2,
  type BillingTier,
} from '../../config/billing.constants.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

// User subscriptions (R5: Stripe-billed). VERIFIER_* tiers get the 50% issuer-verifier
// discount when the user belongs to a verified org. Subscriptions are created only on
// successful payment (PaymentsService.fulfill), since the schema has no pending state.
@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  async me(user: AuthenticatedUser) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        OR: [
          { currentPeriodEnd: null },
          { currentPeriodEnd: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    return sub
      ? {
          id: sub.id,
          tier: sub.tier,
          status: sub.status,
          startedAt: sub.startedAt,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelledAt: sub.cancelledAt,
        }
      : null;
  }

  async plans(user: AuthenticatedUser) {
    const eligible = await this.hasVerifiedMembership(user.id);
    return PLANS.map((plan) => {
      const discounted = eligible && plan.verifierDiscountEligible;
      return {
        tier: plan.tier,
        label: plan.label,
        perks: plan.perks,
        basePrice: plan.price,
        price: discounted
          ? round2(plan.price * (1 - ISSUER_VERIFIER_DISCOUNT))
          : plan.price,
        discounted,
      };
    });
  }

  async subscribe(
    user: AuthenticatedUser,
    tier: BillingTier,
  ): Promise<{ checkout: CheckoutResult }> {
    const plan = PLAN_BY_TIER[tier];
    if (!plan)
      throw new UnprocessableEntityException('Unknown subscription tier');
    const discounted =
      plan.verifierDiscountEligible &&
      (await this.hasVerifiedMembership(user.id));
    const price = discounted
      ? round2(plan.price * (1 - ISSUER_VERIFIER_DISCOUNT))
      : plan.price;
    const checkout = await this.payments.startSubscription(
      user.id,
      tier,
      price,
    );
    return { checkout };
  }

  async cancel(user: AuthenticatedUser) {
    // Cancel every active subscription so cancellation fully removes entitlement, even
    // if a stray duplicate ever existed.
    const result = await this.prisma.subscription.updateMany({
      where: { userId: user.id, status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (result.count === 0)
      throw new UnprocessableEntityException(
        'No active subscription to cancel',
      );
    return { cancelled: result.count };
  }

  private async hasVerifiedMembership(userId: string): Promise<boolean> {
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId, isActive: true, organization: { isVerified: true } },
    });
    return Boolean(member);
  }
}
