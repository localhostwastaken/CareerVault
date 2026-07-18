import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DocumentModule } from '../document/document.module.js';
import { NotificationModule } from '../notification/notification.module.js';
import { BulkIssuanceController } from './bulk-issuance.controller.js';
import { BulkIssuanceService } from './bulk-issuance.service.js';

@Module({
  imports: [AuthModule, DocumentModule, NotificationModule],
  controllers: [BulkIssuanceController],
  providers: [BulkIssuanceService],
})
export class BulkIssuanceModule {}
