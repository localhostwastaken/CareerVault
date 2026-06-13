import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module.js';
import { RecruiterController } from './recruiter.controller.js';
import { RecruiterService } from './recruiter.service.js';
import { TalentController } from './talent.controller.js';
import { TalentService } from './talent.service.js';
import { MessageController } from './message.controller.js';
import { MessageService } from './message.service.js';

@Module({
  imports: [NotificationModule],
  controllers: [RecruiterController, TalentController, MessageController],
  providers: [RecruiterService, TalentService, MessageService],
})
export class RecruiterModule {}
