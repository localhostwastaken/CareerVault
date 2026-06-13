import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

// Org-scoped analytics for the admin console. Every query filters by the caller's
// administered org (org-scoping at the service layer).
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const organizationId = user.memberships.find(
      (m) => m.role === 'ORG_ADMIN',
    )?.organizationId;
    if (!organizationId)
      throw new ForbiddenException('No administered organization');

    const [docsByStatus, membersByRole, links, jobOpenings, matches] =
      await Promise.all([
        this.prisma.document.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: { _all: true },
        }),
        this.prisma.organizationMember.groupBy({
          by: ['role'],
          where: { organizationId, isActive: true },
          _count: { _all: true },
        }),
        this.prisma.sharedLink.aggregate({
          where: { document: { organizationId } },
          _count: { _all: true },
          _sum: { views: true },
        }),
        this.prisma.recruiterJobOpening.count({ where: { organizationId } }),
        this.prisma.talentMatch.count({
          where: { jobOpening: { organizationId } },
        }),
      ]);

    const byStatus: Record<string, number> = {};
    for (const row of docsByStatus) byStatus[row.status] = row._count._all;
    const byRole: Record<string, number> = {};
    for (const row of membersByRole) byRole[row.role] = row._count._all;

    const documentsTotal = Object.values(byStatus).reduce(
      (sum, n) => sum + n,
      0,
    );

    return {
      documents: {
        total: documentsTotal,
        issued: (byStatus.ISSUED ?? 0) + (byStatus.ANCHORED ?? 0),
        anchored: byStatus.ANCHORED ?? 0,
        revoked: byStatus.REVOKED ?? 0,
        inProgress:
          (byStatus.REQUESTED ?? 0) +
          (byStatus.DRAFT ?? 0) +
          (byStatus.PENDING_HR ?? 0),
        byStatus,
      },
      members: {
        total: Object.values(byRole).reduce((sum, n) => sum + n, 0),
        byRole,
      },
      sharing: {
        links: links._count._all,
        views: links._sum.views ?? 0,
      },
      talent: {
        jobOpenings,
        matches,
      },
    };
  }
}
