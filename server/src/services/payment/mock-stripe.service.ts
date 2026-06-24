import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  CheckoutSession,
  OneTimeCheckoutParams,
  PaymentService,
  SubscriptionCheckoutParams,
  WebhookEvent,
} from './payment.service.js';

// Mock processor for the demo: returns a local checkout URL the client can resolve
// to a faux success page, and parses webhook payloads as plain JSON (no signature).
@Injectable()
export class MockStripeService extends PaymentService {
  createOneTimeCheckout(
    params: OneTimeCheckoutParams,
  ): Promise<CheckoutSession> {
    const sessionId = `cs_mock_${randomBytes(8).toString('hex')}`;
    const url = `http://localhost:5173/payments/mock?session=${sessionId}&amount=${params.amount}`;
    return Promise.resolve({ sessionId, checkoutUrl: url });
  }

  createSubscriptionCheckout(
    params: SubscriptionCheckoutParams,
  ): Promise<CheckoutSession> {
    const sessionId = `cs_mock_sub_${randomBytes(8).toString('hex')}`;
    const url = `http://localhost:5173/payments/mock?session=${sessionId}&plan=${params.plan}`;
    return Promise.resolve({ sessionId, checkoutUrl: url });
  }

  parseWebhook(payload: Buffer | string): Promise<WebhookEvent> {
    const body =
      typeof payload === 'string' ? payload : payload.toString('utf8');
    return Promise.resolve(JSON.parse(body) as WebhookEvent);
  }
}
