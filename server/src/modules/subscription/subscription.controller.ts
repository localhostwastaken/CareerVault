import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { SubscriptionService } from './subscription.service.js';
import { SubscribeDto } from './dto/subscribe.dto.js';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptions: SubscriptionService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptions.me(user);
  }

  @Get('plans')
  plans(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptions.plans(user);
  }

  @Post()
  @HttpCode(200)
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubscribeDto) {
    return this.subscriptions.subscribe(user, dto.tier);
  }

  @Post('cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptions.cancel(user);
  }
}
