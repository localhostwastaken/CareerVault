import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { KeyManagementService } from '../../services/key-management/key-management.service.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';
import { generateSalt, hashDocument } from '../../common/utils/crypto.util.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  DocumentStatus,
  MemberRole,
  NotificationType,
} from '../../generated/prisma/enums.js';
import { NotificationService } from '../notification/notification.service.js';
import { SkillService } from '../skill/skill.service.js';
import { EXPIRY_DAYS, TYPE_LABEL } from './document.constants.js';
import { PdfGenerationService } from './pdf-generation.service.js';
import type { ApproveDocumentDto } from './dto/approve-document.dto.js';
import type { ListDocumentsQuery } from './dto/list-documents.query.js';
import type { RejectDocumentDto } from './dto/reject-document.dto.js';
import type { RequestDocumentDto } from './dto/request-document.dto.js';
import type { ResubmitRequestDto } from './dto/resubmit-request.dto.js';
import type { RevokeDocumentDto } from './dto/revoke-document.dto.js';
import type { SignDocumentDto } from './dto/sign-document.dto.js';
import type { UpdateDraftDto } from './dto/update-draft.dto.js';

type PresentedDocument = Prisma.DocumentGetPayload<{
  include: {
    organization: { select: { name: true } };
    holder: { select: { fullName: true; email: true } };
  };
}>;

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kms: KeyManagementService,
    private readonly pdf: PdfGenerationService,
    private readonly notifications: NotificationService,
    private readonly blockchain: BlockchainService,
    private readonly skills: SkillService,
  ) {}

  // Holder requests a document; we resolve the signing manager and notify them.
  async request(holder: AuthenticatedUser, dto: RequestDocumentDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (!org.isVerified)
      throw new UnprocessableEntityException(
        'Organization is not verified yet',
      );

    const signer = await this.resolveSigner(dto);
    const doc = await this.prisma.document.create({
      data: {
        type: dto.type,
        status: 'REQUESTED',
        holderId: holder.id,
        organizationId: org.id,
        signerMemberId: signer.id,
        enableSkillExtraction: dto.enableSkillExtraction ?? false,
        contentJson: (dto.notes
          ? { note: dto.notes }
          : {}) as Prisma.InputJsonObject,
      },
    });
    await this.notifyUser(
      signer.userId,
      'DOCUMENT_REQUESTED',
      'New document request',
      `${holder.fullName} requested a ${TYPE_LABEL[dto.type]} from ${org.name}.`,
    );
    return this.present(doc.id);
  }

  async updateDraft(id: string, actor: AuthenticatedUser, dto: UpdateDraftDto) {
    const doc = await this.getOrThrow(id);
    this.assertStatus(doc.status, ['REQUESTED', 'DRAFT']);
    // The assigned manager or ORG_ADMIN can edit drafts. The holder can also edit
    // their own REQUESTED document (e.g. after a manager returned it for revision).
    if (doc.holderId !== actor.id) {
      await this.requireMember(actor.id, doc.organizationId, ['MANAGER', 'ORG_ADMIN']);
    }
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id },
        data: {
          contentJson: dto.contentJson as Prisma.InputJsonObject,
          status: 'DRAFT',
          version: { increment: 1 },
        },
      });
      await tx.documentVersion.create({
        data: {
          documentId: id,
          versionNumber: updated.version,
          contentJson: dto.contentJson as Prisma.InputJsonObject,
          changedById: actor.id,
          changeSummary: 'Draft updated',
        },
      });
    });
    return this.present(id);
  }

  // Manager signs: compute salt + hash (R4) and sign the hash with the org key (R3).
  // Accepts REQUESTED (first-time: drafting and signing in one step) or DRAFT
  // (already drafted, just signing). Only the manager assigned at request time may
  // sign; ORG_ADMIN can override.
  async sign(id: string, actor: AuthenticatedUser, dto: SignDocumentDto) {
    const doc = await this.getOrThrow(id);
    this.assertStatus(doc.status, ['REQUESTED', 'DRAFT']);

    const member = await this.requireMember(actor.id, doc.organizationId, [
      'MANAGER',
      'ORG_ADMIN',
    ]);

    // Enforce that the signer is the manager assigned at request time. ORG_ADMIN
    // may override a stale assignment (e.g. original manager left the org).
    if (member.role !== 'ORG_ADMIN' && doc.signerMemberId !== member.id) {
      throw new ForbiddenException(
        'Only the assigned manager can sign this document',
      );
    }

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: doc.organizationId },
    });
    const kmsKeyId = await this.ensureOrgKey(org);

    const salt = generateSalt();
    const documentHash = hashDocument(dto.contentJson, salt);
    const managerSignature = await this.kms.sign(kmsKeyId, documentHash);

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id },
        data: {
          contentJson: dto.contentJson as Prisma.InputJsonObject,
          salt,
          documentHash,
          managerSignature,
          signerMemberId: member.id,
          status: 'PENDING_HR',
        },
      });
      await tx.documentVersion.create({
        data: {
          documentId: id,
          versionNumber: updated.version,
          contentJson: dto.contentJson as Prisma.InputJsonObject,
          changedById: actor.id,
          changeSummary: 'Signed by manager',
        },
      });
    });
    await this.notifyOrgRole(
      doc.organizationId,
      'HR',
      'PENDING_HR_REVIEW',
      'Document pending approval',
      `A ${TYPE_LABEL[doc.type]} is ready for HR review.`,
    );
    return this.present(id);
  }

  // HR co-signs and issues; PDF is generated and stored.
  // Dual-signature requirement: the document must carry a manager signature, and
  // the manager who signed cannot also be the HR approver (separation of duties).
  async approve(id: string, actor: AuthenticatedUser, dto: ApproveDocumentDto) {
    const doc = await this.getOrThrow(id);
    this.assertStatus(doc.status, ['PENDING_HR']);
    const member = await this.requireMember(actor.id, doc.organizationId, [
      'HR',
      'ORG_ADMIN',
    ]);

    // Guard: a document must carry a valid manager signature before HR can approve.
    if (!doc.managerSignature) {
      throw new ConflictException(
        'Document has not been signed by a manager yet',
      );
    }
    if (!doc.documentHash)
      throw new ConflictException('Document is not ready for approval');

    // Dual-signature: the manager who signed must not also approve (separation of
    // duties). ORG_ADMIN members who sign can still approve if they also hold an HR
    // role, but they must use a different membership for each action.
    if (doc.signerMemberId) {
      const signerMembership =
        await this.prisma.organizationMember.findUnique({
          where: { id: doc.signerMemberId },
          select: { userId: true },
        });
      if (signerMembership && signerMembership.userId === actor.id) {
        throw new ConflictException(
          'The manager who signed cannot also approve this document',
        );
      }
    }

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: doc.organizationId },
    });
    const kmsKeyId = await this.ensureOrgKey(org);

    const hrSignature = await this.kms.sign(kmsKeyId, doc.documentHash);
    const expiresAt =
      doc.type === 'LETTER_OF_RECOMMENDATION'
        ? null
        : new Date(Date.now() + EXPIRY_DAYS * 86_400_000);
    await this.prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id },
        data: {
          hrSignature,
          approverMemberId: member.id,
          status: 'ISSUED',
          issuedAt: new Date(),
          expiresAt,
        },
      });
      await tx.documentVersion.create({
        data: {
          documentId: id,
          versionNumber: doc.version,
          contentJson: doc.contentJson as Prisma.InputJsonObject,
          changedById: actor.id,
          changeSummary: dto.notes
            ? `Approved by HR: ${dto.notes}`
            : 'Approved by HR',
        },
      });
    });

    const pdfUrl = await this.pdf.generateAndStore(
      {
        id: doc.id,
        type: doc.type,
        documentHash: doc.documentHash,
        contentJson: doc.contentJson,
      },
      { name: org.name, domain: org.domain },
    );
    await this.prisma.document.update({
      where: { id },
      data: { renderedPdfUrl: pdfUrl },
    });
    await this.notifyUser(
      doc.holderId,
      'DOCUMENT_ISSUED',
      'Your document is ready',
      `Your ${TYPE_LABEL[doc.type]} from ${org.name} has been issued.`,
    );
    // Consented skill extraction for talent matching (best-effort; AI downtime must
    // never block issuance).
    if (doc.enableSkillExtraction) {
      await this.skills
        .extractForDocument(id)
        .catch((error) =>
          this.logger.warn(`Skill extraction failed for ${id}: ${error}`),
        );
    }
    return this.present(id);
  }

  // Reject returns the document to DRAFT (R1: no persistent REJECTED state).
  async reject(id: string, actor: AuthenticatedUser, dto: RejectDocumentDto) {
    const doc = await this.getOrThrow(id);
    this.assertStatus(doc.status, ['PENDING_HR']);
    await this.requireMember(actor.id, doc.organizationId, ['HR', 'ORG_ADMIN']);
    // Returning to DRAFT also clears the signed crypto fields: a draft is unsigned, and
    // this stops a rejected draft's stale hash from resolving on public verification.
    await this.prisma.document.update({
      where: { id },
      data: {
        status: 'DRAFT',
        documentHash: null,
        salt: null,
        managerSignature: null,
      },
    });
    if (doc.signerMemberId) {
      const signer = await this.prisma.organizationMember.findUnique({
        where: { id: doc.signerMemberId },
        select: { userId: true },
      });
      if (signer) {
        await this.notifyUser(
          signer.userId,
          'DOCUMENT_REJECTED',
          'Document returned for revision',
          `HR returned a ${TYPE_LABEL[doc.type]}: ${dto.reason}`,
        );
      }
    }
    return this.present(id);
  }

  async revoke(id: string, actor: AuthenticatedUser, dto: RevokeDocumentDto) {
    const doc = await this.getOrThrow(id);
    this.assertStatus(doc.status, ['ISSUED', 'ANCHORED']);
    const member = await this.requireMember(actor.id, doc.organizationId, [
      'HR',
      'ORG_ADMIN',
    ]);
    await this.prisma.document.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedById: member.id,
        revocationReasonCode: dto.code,
        revocationReasonText: dto.reason,
      },
    });
    // DB status is authoritative (R7); the on-chain flag is a secondary tamper-evident
    // trail, so a chain failure must not block the revocation.
    if (doc.documentHash) {
      await this.blockchain
        .revokeDocument(doc.documentHash)
        .catch(() => undefined);
    }
    await this.notifyUser(
      doc.holderId,
      'DOCUMENT_REVOKED',
      'A document was revoked',
      `Your ${TYPE_LABEL[doc.type]} was revoked (${dto.code}).`,
    );
    return this.present(id);
  }

  // Holder edits and resubmits a returned/pending request. Re-assigns the signer
  // if a new manager is selected, auto-assigns otherwise, clears the returned flag,
  // and notifies the manager.
  async resubmitRequest(id: string, actor: AuthenticatedUser, dto: ResubmitRequestDto) {
    const doc = await this.getOrThrow(id);
    if (doc.holderId !== actor.id) {
      throw new ForbiddenException('Only the holder can resubmit this request');
    }
    this.assertStatus(doc.status, ['REQUESTED', 'DRAFT']);
    let signerMemberId: string | null = null;
    if (dto.managerUserId) {
      const signer = await this.prisma.organizationMember.findFirst({
        where: { userId: dto.managerUserId, organizationId: doc.organizationId, role: 'MANAGER', isActive: true },
      });
      if (!signer) throw new NotFoundException('Selected manager is not available');
      signerMemberId = signer.id;
    } else {
      // Auto-assign a manager — same logic as the initial request.
      const anyManager = await this.prisma.organizationMember.findFirst({
        where: { organizationId: doc.organizationId, role: 'MANAGER', isActive: true },
        orderBy: { joinedAt: 'desc' },
      });
      if (!anyManager) throw new UnprocessableEntityException('No managers available at this organization');
      signerMemberId = anyManager.id;
    }
    await this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.type ? { type: dto.type } : {}),
        signerMemberId,
        contentJson: {
          ...(doc.contentJson as Record<string, unknown>),
          note: dto.notes ?? undefined,
          returnedByManager: false,
        } as Prisma.InputJsonObject,
      },
    });
    if (signerMemberId) {
      const signer = await this.prisma.organizationMember.findUniqueOrThrow({ where: { id: signerMemberId }, select: { userId: true } });
      await this.notifyUser(signer.userId, 'DOCUMENT_REQUESTED', 'Request resubmitted', `${actor.fullName} resubmitted a ${TYPE_LABEL[doc.type]} request for ${doc.organizationId ? (await this.prisma.organization.findUniqueOrThrow({ where: { id: doc.organizationId }, select: { name: true } })).name : 'your organization'}.`);
    }
    return this.present(id);
  }

  // Holder deletes their own document before it enters the signing pipeline
  // (REQUESTED, DRAFT) or after it's been revoked.
  async delete(id: string, actor: AuthenticatedUser) {
    const doc = await this.getOrThrow(id);
    if (doc.holderId !== actor.id) {
      throw new ForbiddenException('Only the document holder can delete this');
    }
    this.assertStatus(doc.status, ['REQUESTED', 'DRAFT', 'REVOKED']);
    await this.prisma.document.delete({ where: { id } });
    return { deleted: true };
  }

  // Manager returns a request to the holder for revision (mirrors HR reject).
  // Transitions REQUESTED/DRAFT back to REQUESTED and notifies the holder with
  // the reason so they can fix and resubmit.
  async returnByManager(id: string, actor: AuthenticatedUser, dto: RejectDocumentDto) {
    const doc = await this.getOrThrow(id);
    this.assertStatus(doc.status, ['REQUESTED', 'DRAFT']);
    // Must be the assigned signer for this document.
    await this.requireMember(actor.id, doc.organizationId, ['MANAGER', 'ORG_ADMIN']);
    if (doc.signerMemberId) {
      const assigned = await this.prisma.organizationMember.findUnique({
        where: { id: doc.signerMemberId },
        select: { userId: true },
      });
      if (assigned && assigned.userId !== actor.id) {
        throw new ForbiddenException('Only the assigned manager can return this request');
      }
    }
    await this.prisma.document.update({
      where: { id },
      data: {
        status: 'REQUESTED',
        signerMemberId: null,
        contentJson: { note: dto.reason, returnedByManager: true } as Prisma.InputJsonObject,
      },
    });
    await this.notifyUser(
      doc.holderId,
      'DOCUMENT_REJECTED',
      'Request returned for revision',
      `Your ${TYPE_LABEL[doc.type]} request was returned: ${dto.reason}`,
    );
    return this.present(id);
  }

  async getById(id: string, user: AuthenticatedUser) {
    const doc = await this.getOrThrow(id);
    await this.assertCanView(user, doc);
    return this.present(id);
  }

  // Self-sovereign verification bundle (GDPR / salt-portability).
  //
  // R4 defines document_hash = SHA-256( JCS(content_json) ++ salt ), and the salt lives ONLY
  // in our DB. The issued PDF shows the hash but not the salt, so today verification depends
  // entirely on CareerVault staying online — nobody can recompute the hash to reconcile it
  // against the on-chain Merkle root if our servers vanish. This packages everything needed to
  // verify the credential OFFLINE into one downloadable JSON-LD file the holder controls: the
  // content, the salt, both signatures, the issuer's public key, and the Merkle proof.
  async buildCredential(
    id: string,
    user: AuthenticatedUser,
  ): Promise<VerifiableCredential> {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        organization: {
          select: { name: true, domain: true, publicKeyPem: true },
        },
        holder: { select: { fullName: true } },
        merkleProof: { include: { merkleRoot: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    await this.assertCanView(user, doc);
    // The salt+hash only exist once a manager has signed; a draft has nothing to prove.
    if (!doc.salt || !doc.documentHash) {
      throw new ConflictException(
        'A verification credential is only available once the document is issued',
      );
    }

    const anchor = doc.merkleProof
      ? {
          merkleRoot: doc.merkleProof.merkleRoot.rootHash,
          proofPath: doc.merkleProof.proofPath,
          blockchain: 'polygon',
          txHash: doc.merkleProof.merkleRoot.polygonTxHash,
          blockNumber: doc.merkleProof.merkleRoot.polygonBlockNumber
            ? Number(doc.merkleProof.merkleRoot.polygonBlockNumber)
            : null,
          anchoredAt: doc.merkleProof.merkleRoot.anchoredAt,
        }
      : null;

    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://careervault.io/credentials/v1',
      ],
      type: ['VerifiableCredential', 'CareerVaultDocument'],
      id: `urn:careervault:document:${doc.id}`,
      documentType: doc.type,
      issuer: {
        name: doc.organization.name,
        domain: doc.organization.domain,
        // Public key travels with the file so the RS256 signatures verify without us.
        publicKeyPem: doc.organization.publicKeyPem,
      },
      holder: { name: doc.holder.fullName },
      issuanceDate: doc.issuedAt,
      expirationDate: doc.expiresAt,
      // The exact value the hash is computed over (see proof.documentHash).
      credentialSubject: doc.contentJson,
      proof: {
        type: 'CareerVaultIntegrityProof2024',
        hashAlgorithm: 'SHA-256',
        canonicalization: 'JCS (RFC 8785)',
        // The fix: the salt is embedded so the hash is reproducible without our DB.
        salt: doc.salt,
        documentHash: doc.documentHash,
        signatureAlgorithm: 'RS256',
        managerSignature: doc.managerSignature,
        hrSignature: doc.hrSignature,
      },
      anchor,
      revocation:
        doc.status === 'REVOKED'
          ? {
              revokedAt: doc.revokedAt,
              code: doc.revocationReasonCode,
              reason: doc.revocationReasonText,
            }
          : null,
      verificationInstructions:
        'Recompute SHA-256( JCS(credentialSubject) + proof.salt ) and confirm it equals ' +
        'proof.documentHash. Verify proof.managerSignature and proof.hrSignature (RS256) ' +
        'over proof.documentHash using issuer.publicKeyPem. If anchor is present, confirm ' +
        'the Merkle proofPath reconciles to anchor.merkleRoot and that the root is recorded ' +
        'on-chain at anchor.txHash.',
    };
  }

  // Mirrors list() scoping: holder, HR/Admin/Recruiter of the org, or the signing manager.
  private async assertCanView(
    user: AuthenticatedUser,
    doc: {
      holderId: string;
      organizationId: string;
      signerMemberId: string | null;
    },
  ) {
    if (doc.holderId === user.id) return;
    const membership = user.memberships.find(
      (m) => m.organizationId === doc.organizationId,
    );
    if (membership) {
      if (
        membership.role === 'HR' ||
        membership.role === 'ORG_ADMIN' ||
        membership.role === 'RECRUITER'
      )
        return;
      if (membership.role === 'MANAGER' && doc.signerMemberId) {
        const member = await this.prisma.organizationMember.findFirst({
          where: {
            userId: user.id,
            organizationId: doc.organizationId,
            role: 'MANAGER',
            isActive: true,
          },
        });
        if (member && member.id === doc.signerMemberId) return;
      }
    }
    throw new ForbiddenException('You cannot access this document');
  }

  // Role-aware listing. When `query.role` is set, scopes to that persona so a
  // manager doesn't see their own HOLDER documents mixed into their inbox.
  async list(user: AuthenticatedUser, query: ListDocumentsQuery) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.id, isActive: true },
    });
    const or: Prisma.DocumentWhereInput[] = [];
    if (!query.role || query.role === 'HOLDER') {
      or.push({ holderId: user.id });
    }
    for (const m of memberships) {
      // ORG_ADMIN and HR share the same org-scoped document view, so passing
      // either role matches both memberships.
      if (query.role) {
        const orgRoles: string[] = ['HR', 'ORG_ADMIN', 'RECRUITER'];
        const allowed = orgRoles.includes(query.role) ? orgRoles : [query.role];
        if (!allowed.includes(m.role)) continue;
      }
      if (m.role === 'HR' || m.role === 'ORG_ADMIN' || m.role === 'RECRUITER') {
        or.push({ organizationId: m.organizationId });
      } else if (m.role === 'MANAGER') {
        or.push({ signerMemberId: m.id });
      }
    }
    // Fallback: if no role filter and user has no memberships, they still see
    // their own documents as HOLDER.
    if (or.length === 0) {
      or.push({ holderId: user.id });
    }
    const where: Prisma.DocumentWhereInput = {
      OR: or,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
    };
    const [docs, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: {
          organization: { select: { name: true } },
          holder: { select: { fullName: true, email: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);
    return {
      data: docs.map((doc) => this.toPublic(doc)),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async resolveSigner(dto: RequestDocumentDto) {
    if (dto.managerUserId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: {
          userId: dto.managerUserId,
          organizationId: dto.organizationId,
          role: 'MANAGER',
          isActive: true,
        },
      });
      if (!member)
        throw new NotFoundException(
          'Selected manager is not available at this organization',
        );
      return member;
    }
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: dto.organizationId,
        role: 'MANAGER',
        isActive: true,
      },
      orderBy: { joinedAt: 'desc' },
    });
    if (!member)
      throw new UnprocessableEntityException(
        'No managers are available at this organization',
      );
    return member;
  }

  private async getOrThrow(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  private async present(
    id: string,
  ): Promise<ReturnType<DocumentService['toPublic']>> {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        organization: { select: { name: true } },
        holder: { select: { fullName: true, email: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return this.toPublic(doc);
  }

  // Public: reused by BulkIssuanceService to verify the initiating HR member.
  async requireMember(
    userId: string,
    orgId: string,
    roles: MemberRole[],
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: orgId,
        role: { in: roles },
        isActive: true,
      },
    });
    if (!member)
      throw new ForbiddenException(
        'You do not have the required role in this organization',
      );
    return member;
  }

  // Mint the org signing key on first use (covers seeded/legacy orgs verified without one).
  // Public: reused by BulkIssuanceService, which signs directly without going through the normal sign/approve pipeline.
  async ensureOrgKey(org: {
    id: string;
    kmsKeyId: string | null;
  }): Promise<string> {
    if (org.kmsKeyId) return org.kmsKeyId;
    const { kmsKeyId, publicKeyPem } = await this.kms.generateOrgKeyPair(
      org.id,
    );
    await this.prisma.organization.update({
      where: { id: org.id },
      data: { kmsKeyId, publicKeyPem },
    });
    return kmsKeyId;
  }

  private assertStatus(status: DocumentStatus, allowed: DocumentStatus[]) {
    if (!allowed.includes(status)) {
      throw new ConflictException(
        `Action not allowed while the document is ${status}`,
      );
    }
  }

  private async notifyUser(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    await this.notifications.notify(
      userId,
      type,
      title,
      body,
      user ? { emailTo: user.email } : undefined,
    );
  }

  private async notifyOrgRole(
    orgId: string,
    role: MemberRole,
    type: NotificationType,
    title: string,
    body: string,
  ) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId, role, isActive: true },
      include: { user: { select: { email: true } } },
    });
    for (const m of members) {
      await this.notifications.notify(m.userId, type, title, body, {
        emailTo: m.user.email,
      });
    }
  }

  private toPublic(doc: PresentedDocument) {
    return {
      id: doc.id,
      type: doc.type,
      status: doc.status,
      holderId: doc.holderId,
      holderName: doc.holder.fullName,
      holderEmail: doc.holder.email,
      organizationId: doc.organizationId,
      organizationName: doc.organization.name,
      contentJson: doc.contentJson,
      documentHash: doc.documentHash,
      version: doc.version,
      expiresAt: doc.expiresAt,
      issuedAt: doc.issuedAt,
      revokedAt: doc.revokedAt,
      revocationReasonCode: doc.revocationReasonCode,
      revocationReasonText: doc.revocationReasonText,
      hasManagerSignature: Boolean(doc.managerSignature),
      hasHrSignature: Boolean(doc.hrSignature),
      merkleStatus:
        doc.status === 'ANCHORED'
          ? 'ANCHORED'
          : doc.status === 'ISSUED'
            ? 'PENDING_BATCH'
            : null,
      renderedPdfUrl: doc.renderedPdfUrl,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

// Self-contained, offline-verifiable credential (see DocumentService.buildCredential).
export interface VerifiableCredential {
  '@context': string[];
  type: string[];
  id: string;
  documentType: string;
  issuer: { name: string; domain: string; publicKeyPem: string | null };
  holder: { name: string };
  issuanceDate: Date | null;
  expirationDate: Date | null;
  credentialSubject: Prisma.JsonValue;
  proof: {
    type: string;
    hashAlgorithm: string;
    canonicalization: string;
    salt: string;
    documentHash: string;
    signatureAlgorithm: string;
    managerSignature: string | null;
    hrSignature: string | null;
  };
  anchor: {
    merkleRoot: string;
    proofPath: Prisma.JsonValue;
    blockchain: string;
    txHash: string | null;
    blockNumber: number | null;
    anchoredAt: Date | null;
  } | null;
  revocation: {
    revokedAt: Date | null;
    code: string | null;
    reason: string | null;
  } | null;
  verificationInstructions: string;
}
