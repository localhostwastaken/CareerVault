import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailService } from '../../services/email/email.service.js';
import { assertOrgRole } from '../../common/utils/org-access.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import type { AddMemberDto } from './dto/add-member.dto.js';

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async list(orgId: string, actor: AuthenticatedUser) {
    assertOrgRole(actor, orgId, ['ORG_ADMIN', 'HR']);
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { email: true, fullName: true } } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      fullName: m.user.fullName,
      role: m.role,
      isActive: m.isActive,
      invitedAt: m.invitedAt,
      joinedAt: m.joinedAt,
    }));
  }

  // Find-or-create the user by email, then attach the role. New users are passwordless
  // until they set a password or use a magic link.
  async add(orgId: string, actor: AuthenticatedUser, dto: AddMemberDto) {
    assertOrgRole(actor, orgId, ['ORG_ADMIN']);
    const user =
      (await this.prisma.user.findUnique({ where: { email: dto.email } })) ??
      (await this.prisma.user.create({
        data: {
          email: dto.email,
          fullName: dto.fullName ?? dto.email.split('@')[0],
        },
      }));

    const duplicate = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId_role: {
          userId: user.id,
          organizationId: orgId,
          role: dto.role,
        },
      },
    });
    if (duplicate)
      throw new ConflictException(
        'User already holds this role in the organization',
      );

    const member = await this.prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role: dto.role,
        corporateEmail: dto.email,
        invitedAt: new Date(),
      },
      include: { user: { select: { email: true, fullName: true } } },
    });

    await this.email.send({
      to: dto.email,
      subject: 'You were added to an organization on CareerVault',
      html: `You've been added as ${dto.role}. Sign in to the CareerVault portal to get started.`,
    });

    return {
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      fullName: member.user.fullName,
      role: member.role,
      isActive: member.isActive,
      invitedAt: member.invitedAt,
      joinedAt: member.joinedAt,
    };
  }

  async deactivate(orgId: string, memberId: string, actor: AuthenticatedUser) {
    assertOrgRole(actor, orgId, ['ORG_ADMIN']);
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException('Member not found');
    await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { isActive: false },
    });
    return { id: memberId, isActive: false };
  }
}
