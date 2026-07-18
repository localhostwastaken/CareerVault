import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { ApiKeyGuard } from '../../common/guards/api-key.guard.js';
import { BulkVerifyDto } from './dto/bulk-verify.dto.js';
import { VerificationService } from './verification.service.js';

// Public verification surface (R6) — no authentication. Rate-limited by the global throttler. `/verify/hash/:hash` (3 segments) and `/verify/:token` (2 segments) do not collide. `/verify/bulk` is the paid Bulk API - @Public bypasses the JWT guard, but ApiKeyGuard requires a valid X-API-Key header instead.
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
  @UseGuards(ApiKeyGuard)
  @Post('bulk')
  bulk(@Body() dto: BulkVerifyDto) {
    return this.verification.verifyBulk(dto.hashes);
  }

  @Public()
  @Get(':token')
  byToken(@Param('token') token: string) {
    return this.verification.verifyByToken(token);
  }
}
