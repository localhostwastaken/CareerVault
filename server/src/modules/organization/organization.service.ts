import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DnsVerificationService } from '../../services/dns/dns-verification.service.js';
import { KeyManagementService } from '../../services/key-management/key-management.service.js';
import { assertOrgRole } from '../../common/utils/org-access.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import type { Organization } from '../../generated/prisma/client.js';
import type { CreateOrganizationDto } from './dto/create-organization.dto.js';
import type { UpdateOrganizationDto } from './dto/update-organization.dto.js';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dns: DnsVerificationService,
    private readonly kms: KeyManagementService,
  ) {}

  // Any authenticated user can found an org; they become its first ORG_ADMIN.
  async create(actor: AuthenticatedUser, dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { domain: dto.domain },
    });
    if (existing)
      throw new ConflictException(
        'An organization with this domain already exists',
      );

    const dnsToken = `careervault-verify=${randomBytes(12).toString('hex')}`;
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        domain: dto.domain,
        dnsToken,
        members: {
          create: {
            userId: actor.id,
            role: 'ORG_ADMIN',
            corporateEmail: actor.email,
            joinedAt: new Date(),
          },
        },
      },
    });
    return { ...this.toPublic(org), verificationTxtRecord: dnsToken };
  }

  // R3: minting the org's signing key pair happens at domain verification.
  async verifyDomain(orgId: string, actor: AuthenticatedUser) {
    assertOrgRole(actor, orgId, ['ORG_ADMIN']);
    const org = await this.getOrThrow(orgId);
    if (org.isVerified) return this.toPublic(org);

    const ok = await this.dns.hasTxtRecord(org.domain, org.dnsToken);
    if (!ok) {
      await this.prisma.organization.update({
        where: { id: orgId },
        data: {
          verificationAttempts: { increment: 1 },
          lastVerificationError: 'TXT record not found',
        },
      });
      throw new UnprocessableEntityException(
        `DNS TXT record not found. Add a TXT record: "${org.dnsToken}"`,
      );
    }

    const { kmsKeyId, publicKeyPem } = await this.kms.generateOrgKeyPair(orgId);
    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        lastVerificationError: null,
        kmsKeyId,
        publicKeyPem,
        rootDid: `did:careervault:${orgId}`,
      },
    });
    return this.toPublic(updated);
  }

  async get(orgId: string, actor: AuthenticatedUser) {
    assertOrgRole(actor, orgId, ['ORG_ADMIN', 'HR', 'MANAGER', 'RECRUITER']);
    return this.toPublic(await this.getOrThrow(orgId));
  }

  async update(
    orgId: string,
    actor: AuthenticatedUser,
    dto: UpdateOrganizationDto,
  ) {
    assertOrgRole(actor, orgId, ['ORG_ADMIN']);
    await this.getOrThrow(orgId);
    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: { name: dto.name, logoUrl: dto.logoUrl },
    });
    return this.toPublic(updated);
  }

  // Public list of active managers for a verified org. Used by the document-request
  // form so holders can choose who to route their request to.
  async listManagers(orgId: string) {
    await this.getOrThrow(orgId);
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId, role: 'MANAGER', isActive: true },
      select: { userId: true, user: { select: { fullName: true, email: true } } },
      orderBy: { user: { fullName: 'asc' } },
    });
  }

  // Public directory of verified orgs — used by the holder's document-request picker.
  async listVerified() {
    return this.prisma.organization.findMany({
      where: { isVerified: true },
      select: { id: true, name: true, domain: true },
      orderBy: { name: 'asc' },
    });
  }

  private async getOrThrow(orgId: string): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  // kmsKeyId / publicKeyPem stay server-side; dnsToken is a public DNS value, safe to show org members.
  private toPublic(org: Organization) {
    return {
      id: org.id,
      name: org.name,
      domain: org.domain,
      dnsToken: org.dnsToken,
      isVerified: org.isVerified,
      verifiedAt: org.verifiedAt,
      verificationAttempts: org.verificationAttempts,
      subscriptionTier: org.subscriptionTier,
      logoUrl: org.logoUrl,
      rootDid: org.rootDid,
      createdAt: org.createdAt,
    };
  }
}
