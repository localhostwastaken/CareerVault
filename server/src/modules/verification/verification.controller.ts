import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { ApiKeyGuard } from '../../common/guards/api-key.guard.js';
import { BulkVerifyDto } from './dto/bulk-verify.dto.js';
import { VerificationService } from './verification.service.js';

// Public verification surface (R6) — no authentication, rate-limited by the global throttler.
// A caller sends a document ID or a share token and receives a sanitized verdict; every
// cryptographic check runs here. `/verify/document/:id` (2 segments) and `/verify/:token`
// (1 segment) never collide. `/verify/bulk` is the paid Bulk API: @Public bypasses the JWT
// guard, and ApiKeyGuard requires a valid X-API-Key instead.
@ApiTags('verification')
@Controller('verify')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Public()
  @Get('document/:documentId')
  byDocument(@Param('documentId', ParseUUIDPipe) documentId: string) {
    return this.verification.verifyByDocumentId(documentId);
  }

  @Public()
  @UseGuards(ApiKeyGuard)
  @Post('bulk')
  bulk(@Body() dto: BulkVerifyDto) {
    return this.verification.verifyBulk(dto.documentIds);
  }

  @Public()
  @Get(':token')
  byToken(@Param('token') token: string) {
    return this.verification.verifyByToken(token);
  }
}
