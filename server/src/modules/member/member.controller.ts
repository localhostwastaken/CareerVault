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
import { AddMemberDto } from './dto/add-member.dto.js';
import { MemberService } from './member.service.js';

@ApiTags('members')
@Controller('orgs/:id/members')
export class MemberController {
  constructor(private readonly members: MemberService) {}

  @Get()
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.members.list(id, user);
  }

  @Post()
  add(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddMemberDto,
  ) {
    return this.members.add(id, user, dto);
  }

  @Delete(':memberId')
  @HttpCode(200)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.members.deactivate(id, memberId, user);
  }
}
