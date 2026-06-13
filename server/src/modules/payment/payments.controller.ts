import { Body, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { PaymentsService } from './payments.service.js';
import { MockCompleteDto } from './dto/mock-complete.dto.js';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // Provider webhook (real Stripe). Public + signature-verified on the raw body.
  @Public()
  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    const payload = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    return this.payments.handleWebhook(payload, signature);
  }

  // Mock-only: the demo checkout page calls this to simulate the provider completing.
  @Post('mock/complete')
  @HttpCode(200)
  mockComplete(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MockCompleteDto,
  ) {
    return this.payments.mockComplete(user, dto.sessionId);
  }
}
