import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { SkillService } from './skill.service.js';
import { DiscoverabilityDto } from './dto/discoverability.dto.js';

@ApiTags('skills')
@Controller('skills')
export class SkillController {
  constructor(private readonly skills: SkillService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.skills.listForHolder(user);
  }

  @Put('discoverability')
  @HttpCode(200)
  setDiscoverability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DiscoverabilityDto,
  ) {
    return this.skills.setDiscoverability(user, dto.enabled);
  }

  @Post('extract/:documentId')
  @HttpCode(200)
  async extract(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.skills.extractOwned(user, documentId);
    return { ok: true };
  }
}
