// Payment abstraction. MockStripe (dev) today, real Stripe (test mode) later.
export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
}

export interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

export interface OneTimeCheckoutParams {
  userId: string;
  amount: number; // minor units (cents)
  currency?: string;
  description: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionCheckoutParams {
  userId: string;
  plan: string;
  metadata?: Record<string, string>;
}

export abstract class PaymentService {
  abstract createOneTimeCheckout(
    params: OneTimeCheckoutParams,
  ): Promise<CheckoutSession>;
  abstract createSubscriptionCheckout(
    params: SubscriptionCheckoutParams,
  ): Promise<CheckoutSession>;
  abstract parseWebhook(
    payload: Buffer | string,
    signature?: string,
  ): Promise<WebhookEvent>;
}
