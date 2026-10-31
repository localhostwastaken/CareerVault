import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module.js';
import { EmployeeKeyController } from './employee-key.controller.js';
import { EmployeeKeyService } from './employee-key.service.js';

@Module({
  imports: [NotificationModule],
  controllers: [EmployeeKeyController],
  providers: [EmployeeKeyService],
  exports: [EmployeeKeyService],
})
export class EmployeeKeyModule {}
