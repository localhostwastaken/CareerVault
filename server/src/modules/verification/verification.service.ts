import { Injectable, Logger } from '@nestjs/common';
import {
  describeReadError,
  isFieldReadError,
} from '../../prisma/encryption/field-encryption.extension.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { KeyManagementService } from '../../services/key-management/key-management.service.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { EmployeeKeyService } from '../employee-key/employee-key.service.js';
import {
  PUBLIC_SUBJECT_FIELDS,
  SALARY_PROOF_TYPE,
} from '../document/public-fields.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { DocumentType } from '../../generated/prisma/enums.js';
import { anchorBadge } from './anchor-badge.js';
import {
  runChecks,
  VERIFY_INCLUDE,
  type VerifiableDocument,
} from './verification-checks.js';
import {
  notFoundView,
  unreadableView,
  type PublicVerification,
  type Verdict,
} from './verification-view.js';

const SHARE_TOKEN = /^[0-9a-f]{48}$/i;

const BULK_ITEM_UNAVAILABLE = {
  code: 'VERIFICATION_UNAVAILABLE',
  message: 'This document could not be checked right now. Retry it.',
};

const TYPE_LABEL: Record<string, string> = {
  EXPERIENCE_LETTER: 'experience letter',
  LETTER_OF_RECOMMENDATION: 'letter of recommendation',
  SALARY_PROOF: 'salary proof',
};

// 'public' = anonymous lookup by document ID (allow-listed content); 'shared' = the holder
// shared this document through a link and opted into full disclosure.
type Disclosure = 'public' | 'shared';

type SharedDocumentLink = Prisma.SharedLinkGetPayload<{
  include: { document: { include: typeof VERIFY_INCLUDE } };
}>;

// Public, no-auth verification (R6), entirely server-side. The client sends a document ID
// or a share token and nothing else; the server decrypts the record, rebuilds its bytes,
// recomputes the hash, both employee seals and both RSA signatures, and answers with a
// sanitized verdict (verification-view.ts). The chain is consulted last, as a badge.
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kms: KeyManagementService,
    private readonly blockchain: BlockchainService,
    private readonly notifications: NotificationService,
    private readonly employeeKeys: EmployeeKeyService,
  ) {}

  async verifyByDocumentId(id: string): Promise<PublicVerification> {
    let doc: VerifiableDocument | null;
    try {
      doc = await this.prisma.document.findUnique({
        where: { id },
        include: VERIFY_INCLUDE,
      });
    } catch (error) {
      if (!isFieldReadError(error)) throw error;
      return this.unreadable(id, error);
    }
    return doc ? this.present(doc, 'public') : notFoundView();
  }

  // Bulk API (R6). Each document settles on its own: one that cannot be checked at all gets
  // an error entry rather than costing the caller every other result.
  async verifyBulk(documentIds: string[]) {
    return Promise.all(
      documentIds.map((documentId) =>
        this.verifyByDocumentId(documentId).then(
          (result) => ({ documentId, result, error: null }),
          (error: unknown) => {
            this.logger.error(
              `Bulk verification of ${documentId} failed: ${describeReadError(error)}`,
            );
            return { documentId, result: null, error: BULK_ITEM_UNAVAILABLE };
          },
        ),
      ),
    );
  }

  async verifyByToken(token: string): Promise<PublicVerification> {
    // Not a token's shape: answer without touching the database.
    if (!SHARE_TOKEN.test(token)) return notFoundView();
    const now = new Date();
    let link: SharedDocumentLink | null;
    try {
      link = await this.prisma.sharedLink.findUnique({
        where: { urlToken: token },
        include: { document: { include: VERIFY_INCLUDE } },
      });
    } catch (error) {
      if (!isFieldReadError(error)) throw error;
      // SharedLink has no encrypted field, so read without its document it can't fail this way.
      const bare = await this.prisma.sharedLink.findUnique({
        where: { urlToken: token },
      });
      return bare && isLive(bare, now)
        ? this.unreadable(bare.documentId, error)
        : notFoundView();
    }
    if (!link || !isLive(link, now)) return notFoundView();
    // Atomic view claim: the cap is re-checked under the row lock, so concurrent views
    // cannot exceed maxViews (TOCTOU-safe) — a plain read-then-increment could.
    const where: Prisma.SharedLinkWhereInput = { id: link.id, isActive: true };
    if (link.expiresAt !== null) where.expiresAt = { gt: now };
    if (link.maxViews !== null) where.views = { lt: link.maxViews };
    const claimed = await this.prisma.sharedLink.updateMany({
      where,
      data: { views: { increment: 1 } },
    });
    if (claimed.count === 0) return notFoundView();
    await this.notifications
      .notify(
        link.document.holderId,
        'LINK_VIEWED',
        'Your shared document was viewed',
        `A ${TYPE_LABEL[link.document.type] ?? 'document'} you shared was just opened by a verifier.`,
      )
      .catch(() => undefined);
    return this.present(link.document, 'shared');
  }

  private async present(
    doc: VerifiableDocument,
    disclosure: Disclosure,
  ): Promise<PublicVerification> {
    const outcome = await runChecks(
      doc,
      { kms: this.kms, employeeKeys: this.employeeKeys },
      new Date(),
    );
    const anchor = await anchorBadge(doc, this.blockchain);
    await this.writeAuditLog(doc.id, outcome.verdict);

    const { erased, isIssued } = outcome;
    // HR's free text can name the holder, so it goes with the rest of an erased document.
    const reason = erased ? null : doc.revocationReasonText;
    return {
      verified: outcome.verdict === 'VERIFIED',
      verdict: outcome.verdict,
      erased,
      issuer: {
        name: doc.organization.name,
        domain: doc.organization.domain,
      },
      issuedAt: isIssued ? doc.issuedAt : null,
      expiresAt: isIssued ? doc.expiresAt : null,
      // Nothing about a document that was never issued, nor about an erased one, whose
      // remaining metadata still belongs to the holder.
      document:
        isIssued && !erased
          ? {
              documentId: doc.id,
              type: doc.type,
              status: doc.status,
              // Anonymous salary lookups don't disclose whose salary it is.
              holderName:
                disclosure === 'public' && doc.type === SALARY_PROOF_TYPE
                  ? null
                  : doc.holder.fullName,
              fields: publicFields(doc.contentJson, doc.type, disclosure),
            }
          : null,
      roleSignatures: isIssued ? outcome.roleSignatures : [],
      checks: outcome.checks,
      revocation: outcome.revoked
        ? {
            revokedAt: doc.revokedAt,
            code: doc.revocationReasonCode,
            reason,
          }
        : null,
      anchor,
    };
  }

  // PRD: every public verification writes a COMPLIANCE-tier audit log retained for 7 years.
  // Best-effort — a failed log write must never break verification.
  private async writeAuditLog(
    documentId: string,
    verdict: Verdict,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action:
            verdict === 'VERIFIED'
              ? 'DOCUMENT_VERIFIED'
              : 'DOCUMENT_CHECK_FAILED',
          entityType: 'DOCUMENT',
          entityId: documentId,
          retentionTier: 'COMPLIANCE',
          newValue: { verdict },
        },
      });
    } catch {
      // Audit failure is non-fatal to verification.
    }
  }

  // Sealed fields that won't open under our key, or plaintext that strict mode refuses, mean
  // the row was written around the app. Fail closed as INVALID, disclosing nothing, and
  // record it: one such row must not turn a lookup, or a whole bulk request, into a 500.
  private async unreadable(documentId: string, error: Error) {
    this.logger.error(
      `Public verification of document ${documentId} failed closed: ${error.message}`,
    );
    await this.writeAuditLog(documentId, 'INVALID');
    return unreadableView();
  }
}

// Public lookups expose only the per-type allow-listed scalar fields (D2/B6) — never salary
// paise, PAN/UAN, or personal contact. A holder-shared link opts into the whole document.
function publicFields(
  contentJson: Prisma.JsonValue,
  type: DocumentType,
  disclosure: Disclosure,
): Record<string, string | number | boolean> {
  if (
    !contentJson ||
    typeof contentJson !== 'object' ||
    Array.isArray(contentJson)
  )
    return {};
  const allow =
    disclosure === 'public' ? new Set(PUBLIC_SUBJECT_FIELDS[type]) : null;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(contentJson)) {
    if (allow && !allow.has(key)) continue;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    )
      out[key] = value;
  }
  return out;
}

// Only a pre-check for maxViews: the view claim in verifyByToken re-checks it atomically.
function isLive(
  link: {
    isActive: boolean;
    expiresAt: Date | null;
    maxViews: number | null;
    views: number;
  },
  now: Date,
): boolean {
  return (
    link.isActive &&
    (link.expiresAt === null || link.expiresAt >= now) &&
    (link.maxViews === null || link.views < link.maxViews)
  );
}
