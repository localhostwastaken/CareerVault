import { randomBytes } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  PaymentsService,
  type CheckoutResult,
} from '../payment/payments.service.js';
import { ONE_TIME_LINK_PRICE } from '../../config/billing.constants.js';
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

// Holder-owned share links to issued documents. Free for HOLDER_PREMIUM subscribers;
// otherwise gated behind a one-time payment (R5: pay-before-activate). Public token
// verification lives in the verification module.
@Injectable()
export class ShareLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateShareLinkInput,
  ): Promise<{ shareLink: PublicShareLink; checkout: CheckoutResult | null }> {
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

    const urlToken = randomBytes(24).toString('hex');
    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 86_400_000)
      : null;
    const maxViews = dto.maxViews ?? null;

    if (await this.hasActivePremium(user.id)) {
      const link = await this.prisma.sharedLink.create({
        data: {
          documentId: doc.id,
          urlToken,
          isPaid: true,
          isActive: true,
          maxViews,
          expiresAt,
        },
        include: SHARE_INCLUDE,
      });
      return { shareLink: this.toPublic(link), checkout: null };
    }

    // Paid path: open the provider session (the only external step), then create the
    // inactive link + PENDING payment atomically so a failure can't orphan either.
    const checkout = await this.payments.openOneTimeSession(
      user.id,
      ONE_TIME_LINK_PRICE,
      'CareerVault share link',
    );
    const link = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId: user.id,
          amount: ONE_TIME_LINK_PRICE,
          type: 'ONE_TIME_LINK',
          status: 'PENDING',
          stripePaymentIntentId: checkout.sessionId,
          metadata: {} as Prisma.InputJsonObject,
        },
      });
      const created = await tx.sharedLink.create({
        data: {
          documentId: doc.id,
          urlToken,
          isPaid: false,
          isActive: false,
          maxViews,
          expiresAt,
          paymentId: payment.id,
        },
        include: SHARE_INCLUDE,
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          metadata: { shareLinkId: created.id } as Prisma.InputJsonObject,
        },
      });
      return created;
    });
    return { shareLink: this.toPublic(link), checkout };
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

  private async hasActivePremium(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        tier: 'HOLDER_PREMIUM',
        status: 'ACTIVE',
        OR: [
          { currentPeriodEnd: null },
          { currentPeriodEnd: { gt: new Date() } },
        ],
      },
    });
    return Boolean(sub);
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
