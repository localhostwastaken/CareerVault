import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExplainableAiController } from './explainable-ai/explainable-ai.controller';
import { ExplainableAiService } from './explainable-ai/explainable-ai.service';

@Module({
  imports: [],
  controllers: [AppController, ExplainableAiController],
  providers: [AppService, ExplainableAiService],
})
export class AppModule {}
