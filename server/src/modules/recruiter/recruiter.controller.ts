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
import { RecruiterService } from './recruiter.service.js';
import { CreateJobOpeningDto } from './dto/create-job-opening.dto.js';

@ApiTags('recruiter')
@Controller('recruiter')
@Roles('RECRUITER')
export class RecruiterController {
  constructor(private readonly recruiter: RecruiterService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.recruiter.ensureProfile(user);
    return {
      id: profile.id,
      organizationId: profile.organizationId,
      searchScope: profile.searchScope,
    };
  }

  @Post('job-openings')
  @HttpCode(200)
  createJobOpening(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJobOpeningDto,
  ) {
    return this.recruiter.createJobOpening(user, dto);
  }

  @Get('job-openings')
  listJobOpenings(@CurrentUser() user: AuthenticatedUser) {
    return this.recruiter.listJobOpenings(user);
  }

  @Post('job-openings/:id/close')
  @HttpCode(200)
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recruiter.closeJobOpening(user, id);
  }
}
