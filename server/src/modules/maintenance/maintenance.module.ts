import { Module } from '@nestjs/common';
import { RetentionCron } from './retention.cron.js';

@Module({
  providers: [RetentionCron],
})
export class MaintenanceModule {}
