import { Global, Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module.js';
import { BlockchainModule } from './blockchain/blockchain.module.js';
import { EmailModule } from './email/email.module.js';
import { KeyManagementModule } from './key-management/key-management.module.js';
import { PaymentModule } from './payment/payment.module.js';
import { StorageModule } from './storage/storage.module.js';
import { DnsModule } from './dns/dns.module.js';

// Aggregates the swappable external-integration adapters and re-exports them
// globally, so feature modules inject the abstract tokens without importing each.
@Global()
@Module({
  imports: [
    KeyManagementModule,
    BlockchainModule,
    EmailModule,
    StorageModule,
    PaymentModule,
    AiModule,
    DnsModule,
  ],
  exports: [
    KeyManagementModule,
    BlockchainModule,
    EmailModule,
    StorageModule,
    PaymentModule,
    AiModule,
    DnsModule,
  ],
})
export class ServicesModule {}
