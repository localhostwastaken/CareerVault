import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { VerificationService } from './verification.service.js';

// Public verification surface (R6) — no authentication. Rate-limited by the global
// throttler. `/verify/hash/:hash` (3 segments) and `/verify/:token` (2 segments) do
// not collide.
@ApiTags('verification')
@Controller('verify')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Public()
  @Get('hash/:hash')
  byHash(@Param('hash') hash: string) {
    return this.verification.verifyByHash(hash);
  }

  @Public()
  @Get(':token')
  byToken(@Param('token') token: string) {
    return this.verification.verifyByToken(token);
  }
}
