import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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

  // GDPR erasure (right to be forgotten). Tombstones the user (trips the JWT/refresh
  // kill-switch via isActive=false + gdprDeletedAt), scrubs PII, and removes the
  // AI/discovery/messaging footprint + sessions. Issued documents are retained as the
  // issuer's record (R7) but their salt is removed (dead-hash → no longer verifiable);
  // non-issued drafts have their content scrubbed.
  //
  // Three further erasures, all in the same transaction so erasure is all-or-nothing:
  //  - documentVersion.contentJson: sign/updateDraft/approve each snapshot the full
  //    content into a version row, so scrubbing only document.contentJson would leave a
  //    complete copy of the holder's personal data behind — an Art.17 failure. Versions
  //    of ALL the holder's documents are scrubbed, including issued ones: the retained
  //    issuer record is document.contentJson, the history is not part of that record.
  //  - verifierApiKey: a key is a live credential bound to the erased identity. Revoking
  //    here mirrors the cancel-revokes-keys rule (R6) so no credential outlives its owner.
  //  - sharedLink: public links resolve by urlToken with no session, so they would keep
  //    serving the holder's documents to anyone holding the URL after erasure.
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
        data: { salt: null },
      }),
      this.prisma.document.updateMany({
        where: {
          holderId: userId,
          status: { in: ['REQUESTED', 'DRAFT', 'PENDING_HR'] },
        },
        data: { contentJson: {} as Prisma.InputJsonValue },
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
    ]);
    return { deleted: true };
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
