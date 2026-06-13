import { Injectable } from '@nestjs/common';
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
  async deleteAccount(userId: string) {
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
