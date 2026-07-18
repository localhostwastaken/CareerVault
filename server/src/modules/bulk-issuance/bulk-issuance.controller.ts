import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { BulkIssuanceService } from './bulk-issuance.service.js';
import { UploadBulkIssuanceDto } from './dto/upload-bulk-issuance.dto.js';

class OrgScopeQuery {
  @IsUUID()
  organizationId!: string;
}

@ApiTags('bulk-issuance')
@Controller('bulk-issuance')
@Roles('HR', 'ORG_ADMIN')
export class BulkIssuanceController {
  constructor(private readonly bulkIssuance: BulkIssuanceService) {}

  @Post()
  @HttpCode(202)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadBulkIssuanceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.bulkIssuance.upload(user, dto, file);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: OrgScopeQuery) {
    return this.bulkIssuance.list(user, query.organizationId);
  }

  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bulkIssuance.get(user, id);
  }
}
