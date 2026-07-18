import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { pageMeta } from '../../common/dtos/pagination.dto.js';
import type { AuditLogQueryDto } from './audit.dto.js';

// Org-scoped audit log reader. Surfaces events where:
//   (a) entityType=DOCUMENT and the document belongs to the admin's org, OR
//   (b) actorId is a member of the admin's org.
// This covers all current write sites (verification events + lifecycle crons).
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, query: AuditLogQueryDto) {
    const organizationId = user.memberships.find(
      (m) => m.role === 'ORG_ADMIN',
    )?.organizationId;
    if (!organizationId)
      throw new ForbiddenException('No administered organization');

    // Resolve the IDs that define the org's scope in the audit table
    const [orgDocs, orgMembers] = await Promise.all([
      this.prisma.document.findMany({
        where: { organizationId },
        select: { id: true },
      }),
      this.prisma.organizationMember.findMany({
        where: { organizationId },
        select: { userId: true },
      }),
    ]);

    const orgDocIds = orgDocs.map((d) => d.id);
    const orgMemberUserIds = orgMembers.map((m) => m.userId);

    const scopeOr = [
      ...(orgDocIds.length
        ? [{ entityType: 'DOCUMENT' as const, entityId: { in: orgDocIds } }]
        : []),
      ...(orgMemberUserIds.length
        ? [{ actorId: { in: orgMemberUserIds } }]
        : []),
    ];

    const where = {
      ...(scopeOr.length ? { OR: scopeOr } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorType
        ? { actorType: query.actorType as 'USER' | 'SYSTEM' | 'CRON' }
        : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.retentionTier
        ? {
            retentionTier: query.retentionTier as 'STANDARD' | 'COMPLIANCE',
          }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: { actor: { select: { fullName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, meta: pageMeta(total, query) };
  }
}
