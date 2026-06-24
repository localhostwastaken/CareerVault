import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { AnalyticsService } from './analytics.service.js';

@ApiTags('analytics')
@Controller('analytics')
@Roles('ORG_ADMIN')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.analytics.overview(user);
  }
}
