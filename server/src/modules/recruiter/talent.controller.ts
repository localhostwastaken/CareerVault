import {
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
import { TalentService } from './talent.service.js';

@ApiTags('recruiter')
@Controller('recruiter/job-openings')
@Roles('RECRUITER')
export class TalentController {
  constructor(private readonly talent: TalentService) {}

  @Post(':id/search')
  @HttpCode(200)
  search(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.talent.search(user, id);
  }

  @Get(':id/matches')
  matches(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.talent.listMatches(user, id);
  }
}
