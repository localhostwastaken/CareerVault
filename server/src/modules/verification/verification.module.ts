import { Module } from '@nestjs/common';
import { EmployeeKeyModule } from '../employee-key/employee-key.module.js';
import { NotificationModule } from '../notification/notification.module.js';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';

@Module({
  imports: [EmployeeKeyModule, NotificationModule],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
