import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module.js';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';

@Module({
  imports: [NotificationModule],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
