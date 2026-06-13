import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PaymentService } from '../../services/payment/payment.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { toCents } from '../../config/billing.constants.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { SubscriptionTier } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

type PaymentRow = Prisma.PaymentGetPayload<object>;

const TIERS = new Set<string>([
  'HOLDER_PREMIUM',
  'VERIFIER_BASIC',
  'VERIFIER_ENTERPRISE',
]);

export interface CheckoutResult {
  sessionId: string;
  checkoutUrl: string;
  amount: number;
}

// Owns the money. Opens provider checkout sessions and is the single fulfillment point
// (the real provider webhook, or the authenticated mock-complete in the demo).
// Fulfillment is atomic + idempotent and provisions the linked entity, then notifies.
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly mock: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentService,
    private readonly notifications: NotificationService,
    config: ConfigService,
  ) {
    this.mock = config.get<string>('PAYMENT_DRIVER') === 'mock';
  }

  // Gateway-only: returns a checkout session without writing a Payment, so the caller
  // can create the Payment atomically alongside whatever it gates (see ShareLinkService).
  async openOneTimeSession(
    userId: string,
    amount: number,
    description: string,
  ): Promise<CheckoutResult> {
    const session = await this.gateway.createOneTimeCheckout({
      userId,
      amount: toCents(amount),
      description,
    });
    return { ...session, amount };
  }

  async startSubscription(
    userId: string,
    tier: SubscriptionTier,
    amount: number,
  ): Promise<CheckoutResult> {
    const session = await this.gateway.createSubscriptionCheckout({
      userId,
      plan: tier,
      metadata: { tier },
    });
    await this.prisma.payment.create({
      data: {
        userId,
        amount,
        type: 'SUBSCRIPTION',
        status: 'PENDING',
        stripePaymentIntentId: session.sessionId,
        metadata: { tier } as Prisma.InputJsonObject,
      },
    });
    return { ...session, amount };
  }

  // Mock-only: stands in for the provider redirect completing. Verifies the payment
  // belongs to the caller so one user can't fulfill another's checkout.
  async mockComplete(user: AuthenticatedUser, sessionId: string) {
    if (!this.mock) throw new NotFoundException('Not available');
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: sessionId },
    });
    if (!payment) throw new NotFoundException('Checkout session not found');
    if (payment.userId !== user.id)
      throw new ForbiddenException('Not your checkout');
    await this.fulfill(payment);
    return { ok: true };
  }

  // Real-provider webhook. Disabled under the mock driver (the mock parser does no
  // signature check, so accepting it would let anyone fulfill a PENDING payment).
  async handleWebhook(payload: Buffer | string, signature?: string) {
    if (this.mock)
      throw new NotFoundException('Webhook unavailable for mock driver');
    const event = await this.gateway.parseWebhook(payload, signature);
    const sessionId = readString(event.data, 'sessionId');
    const completes =
      event.type === 'checkout.session.completed' ||
      event.type === 'payment_intent.succeeded';
    if (completes && sessionId) {
      const payment = await this.prisma.payment.findFirst({
        where: { stripePaymentIntentId: sessionId },
      });
      // Let fulfillment errors propagate so the provider retries delivery.
      if (payment) await this.fulfill(payment);
    }
    return { received: true };
  }

  // Idempotent + atomic. The PENDING->COMPLETED flip IS the gate: only the transaction
  // that wins the flip provisions, so concurrent webhook/mock-complete can't double-fulfill.
  private async fulfill(payment: PaymentRow): Promise<void> {
    const shareLinkId = readString(payment.metadata, 'shareLinkId');
    const tier = readString(payment.metadata, 'tier');

    const provisioned = await this.prisma.$transaction(async (tx) => {
      const flip = await tx.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: 'COMPLETED' },
      });
      if (flip.count === 0) return false;

      if (payment.type === 'ONE_TIME_LINK' && shareLinkId) {
        await tx.sharedLink.update({
          where: { id: shareLinkId },
          data: { isPaid: true, isActive: true },
        });
      } else if (payment.type === 'SUBSCRIPTION' && tier && TIERS.has(tier)) {
        // One active subscription per user: supersede any current one in the same tx.
        await tx.subscription.updateMany({
          where: { userId: payment.userId, status: 'ACTIVE' },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        await tx.subscription.create({
          data: {
            userId: payment.userId,
            tier: tier as SubscriptionTier,
            status: 'ACTIVE',
            startedAt: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
            stripeSubscriptionId: payment.stripePaymentIntentId,
          },
        });
      }
      return true;
    });

    if (provisioned) {
      await this.notify(payment.userId, Number(payment.amount)).catch((error) =>
        this.logger.warn(`Payment notification failed: ${error}`),
      );
    }
  }

  private async notify(userId: string, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    await this.notifications.notify(
      userId,
      'PAYMENT_SUCCESS',
      'Payment received',
      `Your payment of $${amount.toFixed(2)} was processed successfully.`,
      user ? { emailTo: user.email } : undefined,
    );
  }
}

// Narrow a Json metadata blob to a single string field without trusting its shape.
function readString(meta: unknown, key: string): string | undefined {
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const value = (meta as Record<string, unknown>)[key];
    if (typeof value === 'string') return value;
  }
  return undefined;
}
