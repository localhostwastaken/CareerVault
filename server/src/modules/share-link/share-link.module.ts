import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payment/payments.module.js';
import { ShareLinkController } from './share-link.controller.js';
import { ShareLinkCron } from './share-link.cron.js';
import { ShareLinkService } from './share-link.service.js';

@Module({
  imports: [PaymentsModule],
  controllers: [ShareLinkController],
  providers: [ShareLinkService, ShareLinkCron],
})
export class ShareLinkModule {}
