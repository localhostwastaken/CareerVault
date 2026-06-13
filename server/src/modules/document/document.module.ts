import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module.js';
import { SkillModule } from '../skill/skill.module.js';
import { DocumentController } from './document.controller.js';
import { DocumentService } from './document.service.js';
import { PdfGenerationService } from './pdf-generation.service.js';

@Module({
  imports: [NotificationModule, SkillModule],
  controllers: [DocumentController],
  providers: [DocumentService, PdfGenerationService],
  exports: [PdfGenerationService],
})
export class DocumentModule {}
