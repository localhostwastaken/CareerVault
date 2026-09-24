import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../../services/storage/storage.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { pdfStorageKey } from '../document/pdf-storage-key.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.toProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
        isDiscoverable: dto.isDiscoverable,
      },
    });
    return this.toProfile(user);
  }

  // GDPR erasure (right to be forgotten, Art. 17). Tombstones the user (trips the
  // JWT/refresh kill-switch via isActive=false + gdprDeletedAt), scrubs PII, and removes the
  // AI/discovery/messaging footprint + sessions.
  //
  // Documents: every one of the holder's documents, issued, anchored, revoked and expired
  // ones included, loses its content and its salt. What stays is the issuer's record (R7)
  // that a document existed: type, status, dates, any revocation code and reason, the hash,
  // both signatures and the Merkle proof. The anchored hash is then a dead hash: with no
  // content and no salt nobody can recompute it, and VerificationService discloses nothing
  // about the holder for it, only that they exercised erasure (is-erased.ts).
  //
  // Also in the one transaction, so erasure is all-or-nothing:
  //  - documentVersion.contentJson: sign/updateDraft/approve each snapshot the full
  //    content into a version row, so every snapshot is scrubbed too.
  //  - verifierApiKey: a key is a live credential bound to the erased identity. Revoking
  //    here mirrors the cancel-revokes-keys rule (R6) so no credential outlives its owner.
  //  - sharedLink: public links resolve by urlToken with no session, so they would keep
  //    serving the holder's documents to anyone holding the URL after erasure.
  //  - a USER_ERASED audit row (accountability, Art. 5(2)), holding ids only, no PII.
  //
  // Stored PDFs are deleted after the commit: storage is not transactional, so a failed
  // delete must not roll back, or block, an erasure the database has already made.
  async deleteAccount(userId: string) {
    // Same last-admin protection as MemberService.deactivate: erasure deactivates every
    // membership, so the sole ORG_ADMIN erasing themselves would orphan the organization
    // with no recovery path (there is no platform superadmin role).
    const adminRoles = await this.prisma.organizationMember.findMany({
      where: { userId, role: 'ORG_ADMIN', isActive: true },
      select: { organizationId: true },
    });
    for (const { organizationId } of adminRoles) {
      const activeAdmins = await this.prisma.organizationMember.count({
        where: { organizationId, role: 'ORG_ADMIN', isActive: true },
      });
      if (activeAdmins <= 1) {
        throw new ConflictException(
          'You are the last administrator of an organization. Promote another admin before deleting your account.',
        );
      }
    }

    const documents = await this.prisma.document.findMany({
      where: { holderId: userId },
      select: { id: true },
    });
    const anonymizedEmail = `deleted+${userId}@careervault.invalid`;
    await this.prisma.$transaction([
      this.prisma.extractedSkill.deleteMany({
        where: { document: { holderId: userId } },
      }),
      this.prisma.talentMatch.deleteMany({ where: { holderId: userId } }),
      this.prisma.recruiterMessage.deleteMany({ where: { holderId: userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.organizationMember.updateMany({
        where: { userId },
        data: { isActive: false, corporateEmail: anonymizedEmail },
      }),
      this.prisma.document.updateMany({
        where: { holderId: userId },
        data: {
          salt: null,
          contentJson: {} as Prisma.InputJsonValue,
          renderedPdfUrl: null,
        },
      }),
      this.prisma.documentVersion.updateMany({
        where: { document: { holderId: userId } },
        data: { contentJson: {} as Prisma.InputJsonValue },
      }),
      this.prisma.verifierApiKey.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      }),
      this.prisma.sharedLink.updateMany({
        where: { document: { holderId: userId }, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          fullName: 'Deleted User',
          phone: null,
          avatarUrl: null,
          passwordHash: null,
          isDiscoverable: false,
          emailVerified: false,
          isActive: false,
          gdprDeletedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: userId,
          actorType: 'USER',
          action: 'USER_ERASED',
          entityType: 'USER',
          entityId: userId,
          retentionTier: 'COMPLIANCE',
        },
      }),
    ]);
    await this.deletePdfs(userId, documents);
    return { deleted: true };
  }

  private async deletePdfs(
    userId: string,
    documents: { id: string }[],
  ): Promise<void> {
    const results = await Promise.allSettled(
      documents.map(({ id }) => this.storage.delete(pdfStorageKey(id))),
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0)
      this.logger.error(
        `GDPR erasure of user ${userId}: ${failed} of ${documents.length} stored PDF(s) could not be deleted; remove them by hand`,
      );
  }

  private toProfile(user: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    isDiscoverable: boolean;
    emailVerified: boolean;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isDiscoverable: user.isDiscoverable,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
