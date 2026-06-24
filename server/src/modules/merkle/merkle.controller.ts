import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { MerkleService } from './merkle.service.js';

// Ops surface for the anchoring engine. The midnight cron runs the platform-wide batch
// automatically; this lets an admin trigger/inspect anchoring for THEIR OWN org on
// demand. Org-scoping is enforced here (an admin may not anchor other tenants' docs).
@ApiTags('merkle')
@Controller('merkle')
export class MerkleController {
  constructor(private readonly merkle: MerkleService) {}

  @Post('run')
  @Roles('ORG_ADMIN')
  @HttpCode(200)
  run(@CurrentUser() user: AuthenticatedUser) {
    return this.merkle.runBatch(this.adminOrgId(user));
  }

  @Get('batches')
  @Roles('ORG_ADMIN')
  batches(@CurrentUser() user: AuthenticatedUser) {
    return this.merkle.listBatches(this.adminOrgId(user));
  }

  private adminOrgId(user: AuthenticatedUser): string {
    const orgId = user.memberships.find(
      (m) => m.role === 'ORG_ADMIN',
    )?.organizationId;
    if (!orgId) throw new ForbiddenException('No administered organization');
    return orgId;
  }
}
