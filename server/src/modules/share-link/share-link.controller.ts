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
import { ShareLinkService } from './share-link.service.js';
import { CreateShareLinkDto } from './dto/create-share-link.dto.js';

@ApiTags('share-links')
@Controller('share-links')
export class ShareLinkController {
  constructor(private readonly shareLinks: ShareLinkService) {}

  @Post()
  @HttpCode(200)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShareLinkDto,
  ) {
    return this.shareLinks.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.shareLinks.list(user);
  }

  @Delete(':id')
  @HttpCode(200)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shareLinks.deactivate(id, user);
  }
}
