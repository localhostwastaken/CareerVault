import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { MessageService } from './message.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { RespondMessageDto } from './dto/respond-message.dto.js';

@ApiTags('messages')
@Controller('messages')
export class MessageController {
  constructor(private readonly messages: MessageService) {}

  @Post()
  @Roles('RECRUITER')
  @HttpCode(200)
  send(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendMessageDto) {
    return this.messages.send(user, dto);
  }

  @Get('sent')
  @Roles('RECRUITER')
  sent(@CurrentUser() user: AuthenticatedUser) {
    return this.messages.listSent(user);
  }

  // Holder side — any authenticated user.
  @Get('received')
  received(@CurrentUser() user: AuthenticatedUser) {
    return this.messages.listReceived(user);
  }

  @Post(':id/respond')
  @HttpCode(200)
  respond(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RespondMessageDto,
  ) {
    return this.messages.respond(user, id, dto.responseType);
  }
}
