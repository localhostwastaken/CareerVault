import { randomBytes } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

const SHARE_INCLUDE = {
  document: {
    select: { type: true, organization: { select: { name: true } } },
  },
} satisfies Prisma.SharedLinkInclude;

type ShareLinkRow = Prisma.SharedLinkGetPayload<{
  include: typeof SHARE_INCLUDE;
}>;

// Holder-owned share links to issued documents. Free for every holder: billing is future
// scope (SCOPE.md, decision 2026-11-14), so a link is active the moment it is created. The
// payment module and the Payment table stay dormant. Public token verification lives in
// the verification module.
@Injectable()
export class ShareLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateShareLinkInput,
  ): Promise<{ shareLink: PublicShareLink; checkout: null }> {
    const doc = await this.prisma.document.findUnique({
      where: { id: dto.documentId },
    });
    if (!doc || doc.holderId !== user.id)
      throw new NotFoundException('Document not found');
    if (doc.status !== 'ISSUED' && doc.status !== 'ANCHORED') {
      throw new UnprocessableEntityException(
        'Only issued documents can be shared',
      );
    }

    const link = await this.prisma.sharedLink.create({
      data: {
        documentId: doc.id,
        urlToken: randomBytes(24).toString('hex'),
        isPaid: true,
        isActive: true,
        maxViews: dto.maxViews ?? null,
        expiresAt: dto.expiresInDays
          ? new Date(Date.now() + dto.expiresInDays * 86_400_000)
          : null,
      },
      include: SHARE_INCLUDE,
    });
    return { shareLink: this.toPublic(link), checkout: null };
  }

  async list(user: AuthenticatedUser): Promise<PublicShareLink[]> {
    const links = await this.prisma.sharedLink.findMany({
      // Hide abandoned never-paid checkouts; show anything paid or currently active.
      where: {
        document: { holderId: user.id },
        OR: [{ isPaid: true }, { isActive: true }],
      },
      orderBy: { createdAt: 'desc' },
      include: SHARE_INCLUDE,
    });
    return links.map((link) => this.toPublic(link));
  }

  async deactivate(id: string, user: AuthenticatedUser) {
    const link = await this.prisma.sharedLink.findUnique({
      where: { id },
      include: { document: { select: { holderId: true } } },
    });
    if (!link || link.document.holderId !== user.id)
      throw new NotFoundException('Link not found');
    await this.prisma.sharedLink.update({
      where: { id },
      data: { isActive: false },
    });
    return { id, isActive: false };
  }

  private toPublic(link: ShareLinkRow): PublicShareLink {
    return {
      id: link.id,
      urlToken: link.urlToken,
      isPaid: link.isPaid,
      isActive: link.isActive,
      views: link.views,
      maxViews: link.maxViews,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      documentType: link.document.type,
      organizationName: link.document.organization.name,
    };
  }
}

export interface CreateShareLinkInput {
  documentId: string;
  maxViews?: number;
  expiresInDays?: number;
}

export interface PublicShareLink {
  id: string;
  urlToken: string;
  isPaid: boolean;
  isActive: boolean;
  views: number;
  maxViews: number | null;
  expiresAt: Date | null;
  createdAt: Date;
  documentType: string;
  organizationName: string;
}
