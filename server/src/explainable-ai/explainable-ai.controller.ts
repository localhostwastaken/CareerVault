import { Body, Controller, Post } from '@nestjs/common';
import { ExplainableAiService } from './explainable-ai.service';
import type { ExplainCandidateRequest } from '../contracts/explainability';

@Controller('ai')
export class ExplainableAiController {
  constructor(private readonly explainableAiService: ExplainableAiService) {}

  @Post('explain')
  explainCandidate(@Body() body: ExplainCandidateRequest) {
    return this.explainableAiService.explainCandidate(body);
  }
}
