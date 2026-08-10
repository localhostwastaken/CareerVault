import { Module } from '@nestjs/common';
import { RetentionCron } from './retention.cron.js';
import { SubscriptionExpiryCron } from './subscription-expiry.cron.js';

@Module({
  providers: [RetentionCron, SubscriptionExpiryCron],
})
export class MaintenanceModule {}
