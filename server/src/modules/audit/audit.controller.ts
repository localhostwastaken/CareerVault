import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { AuditService } from './audit.service.js';
import { AuditLogQueryDto } from './audit.dto.js';

@ApiTags('audit')
@Controller('audit')
@Roles('ORG_ADMIN')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  // GET /api/v1/audit/logs?page=1&limit=20&action=DOCUMENT_VERIFIED&actorType=SYSTEM&retentionTier=COMPLIANCE
  @Get('logs')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.audit.list(user, query);
  }
}
