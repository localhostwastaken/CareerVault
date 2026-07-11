import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { CreateVerifierKeyDto } from './dto/create-verifier-key.dto.js';
import { VerifierKeyService } from './verifier-key.service.js';

// Self-service key management for any authenticated user with an active verifier subscription - not role-gated, since "verifier" isn't an org role (R6: public, no-account verification is separate from this paid, authenticated Bulk API).
@ApiTags('verifier-keys')
@Controller('verifier-keys')
export class VerifierKeyController {
  constructor(private readonly verifierKeys: VerifierKeyService) {}

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVerifierKeyDto,
  ) {
    return this.verifierKeys.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.verifierKeys.list(user);
  }

  @Delete(':id')
  @HttpCode(200)
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.verifierKeys.revoke(user, id);
  }
}
