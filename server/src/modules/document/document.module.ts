import { Module } from '@nestjs/common';
import { EmployeeKeyModule } from '../employee-key/employee-key.module.js';
import { NotificationModule } from '../notification/notification.module.js';
import { SkillModule } from '../skill/skill.module.js';
import { DocumentController } from './document.controller.js';
import { DocumentService } from './document.service.js';
import { PdfGenerationService } from './pdf-generation.service.js';

@Module({
  imports: [EmployeeKeyModule, NotificationModule, SkillModule],
  controllers: [DocumentController],
  providers: [DocumentService, PdfGenerationService],
  exports: [DocumentService, PdfGenerationService],
})
export class DocumentModule {}
