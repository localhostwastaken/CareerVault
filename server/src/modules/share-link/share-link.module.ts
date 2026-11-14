import { Module } from '@nestjs/common';
import { ShareLinkController } from './share-link.controller.js';
import { ShareLinkCron } from './share-link.cron.js';
import { ShareLinkService } from './share-link.service.js';

@Module({
  controllers: [ShareLinkController],
  providers: [ShareLinkService, ShareLinkCron],
})
export class ShareLinkModule {}
