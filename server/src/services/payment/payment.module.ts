import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockStripeService } from './mock-stripe.service.js';
import { PaymentService } from './payment.service.js';

@Module({
  providers: [
    MockStripeService,
    {
      provide: PaymentService,
      useFactory: (
        config: ConfigService,
        mock: MockStripeService,
      ): PaymentService => {
        const driver = config.get<string>('PAYMENT_DRIVER');
        if (driver === 'mock') return mock;
        throw new Error(
          `PAYMENT_DRIVER="${driver}" not implemented (only "mock")`,
        );
      },
      inject: [ConfigService, MockStripeService],
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
