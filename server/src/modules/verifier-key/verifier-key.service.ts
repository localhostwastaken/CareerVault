import { randomBytes } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { sha256Hex } from '../../common/utils/crypto.util.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import type { VerifierKeyTier } from '../../generated/prisma/enums.js';
import type { CreateVerifierKeyDto } from './dto/create-verifier-key.dto.js';

const KEY_PREFIX = 'cv_';

// Verifier API keys (Bulk API, R6) are gated by billing that's already fully built - a key can only be minted while the user holds an active VERIFIER_BASIC/ENTERPRISE Subscription, and its tier mirrors that subscription's tier.
@Injectable()
export class VerifierKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateVerifierKeyDto) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        tier: { in: ['VERIFIER_BASIC', 'VERIFIER_ENTERPRISE'] },
        OR: [
          { currentPeriodEnd: null },
          { currentPeriodEnd: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) {
      throw new UnprocessableEntityException(
        'An active verifier subscription is required to create an API key',
      );
    }
    const tier: VerifierKeyTier =
      subscription.tier === 'VERIFIER_ENTERPRISE' ? 'ENTERPRISE' : 'BASIC';

    // Issuer-verifier discount (R6): tag the key with the org if the user is also
    // an active member of a verified (issuing) organization.
    const issuerMembership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        organization: { isVerified: true },
      },
    });

    const raw = KEY_PREFIX + randomBytes(32).toString('hex');
    const key = await this.prisma.verifierApiKey.create({
      data: {
        userId: user.id,
        organizationId: issuerMembership?.organizationId,
        apiKeyHash: sha256Hex(raw),
        name: dto.name,
        tier,
      },
    });

    // The raw key is only ever available at creation time — the API stores just its hash.
    return { ...this.toPublic(key), apiKey: raw };
  }

  async list(user: AuthenticatedUser) {
    const keys = await this.prisma.verifierApiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return keys.map((key) => this.toPublic(key));
  }

  async revoke(user: AuthenticatedUser, id: string) {
    const key = await this.prisma.verifierApiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('API key not found');
    if (key.userId !== user.id) {
      throw new ForbiddenException('You do not own this API key');
    }
    const updated = await this.prisma.verifierApiKey.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    return this.toPublic(updated);
  }

  private toPublic(key: {
    id: string;
    name: string | null;
    tier: string;
    status: string;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: key.id,
      name: key.name,
      tier: key.tier,
      status: key.status,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    };
  }
}
