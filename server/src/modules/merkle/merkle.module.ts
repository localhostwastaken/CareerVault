import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module.js';
import { DocumentModule } from '../document/document.module.js';
import { MerkleController } from './merkle.controller.js';
import { MerkleCron } from './merkle.cron.js';
import { MerkleService } from './merkle.service.js';

@Module({
  imports: [NotificationModule, DocumentModule],
  controllers: [MerkleController],
  providers: [MerkleService, MerkleCron],
  exports: [MerkleService],
})
export class MerkleModule {}
