import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { KeyManagementService } from '../../services/key-management/key-management.service.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';
import { NotificationService } from '../notification/notification.service.js';
import {
  hashDocument,
  signingStatementHash,
} from '../../common/utils/crypto.util.js';
import {
  PUBLIC_SUBJECT_FIELDS,
  SALARY_PROOF_TYPE,
} from '../document/public-fields.js';
import {
  verifyMerkleProof,
  type MerkleProofStep,
} from '../../common/utils/merkle.util.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { DocumentType } from '../../generated/prisma/enums.js';

const TYPE_LABEL: Record<string, string> = {
  EXPERIENCE_LETTER: 'experience letter',
  LETTER_OF_RECOMMENDATION: 'letter of recommendation',
  SALARY_PROOF: 'salary proof',
};

export type CheckStatus = 'pass' | 'fail' | 'pending';
export type Verdict =
  | 'VERIFIED'
  // Signed and cryptographically valid, but the daily Merkle anchor is still pending.
  // This is a PASS state (not INVALID) — a document is fully usable before it anchors.
  | 'VERIFIED_PENDING_ANCHOR'
  | 'REVOKED'
  | 'EXPIRED'
  | 'INVALID'
  | 'NOT_FOUND';

// 'public' = anonymous hash lookup (privacy-gated content); 'shared' = holder shared
// this specific document via a link and opted into full disclosure.
type Disclosure = 'public' | 'shared';

export interface Check {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

const INCLUDE = {
  organization: { select: { name: true, publicKeyPem: true } },
  holder: { select: { fullName: true } },
  merkleProof: { include: { merkleRoot: true } },
} satisfies Prisma.DocumentInclude;

type VerifiableDocument = Prisma.DocumentGetPayload<{
  include: typeof INCLUDE;
}>;

// Public, no-auth verification (R6). Recomputes every guarantee from scratch using the
// SAME primitives that produced them (R4 hash, R3 RS256 signatures, Merkle proof,
// DB-authoritative revocation per R7) — never trusts a stored "is valid" flag.
@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kms: KeyManagementService,
    private readonly blockchain: BlockchainService,
    private readonly notifications: NotificationService,
  ) {}

  async verifyByHash(hash: string) {
    if (!/^[0-9a-f]{64}$/i.test(hash)) return this.notFound();
    const doc = await this.prisma.document.findFirst({
      where: { documentHash: hash.toLowerCase() },
      include: INCLUDE,
    });
    return doc ? this.present(doc, 'public') : this.notFound();
  }

  // Bulk API (R6): enterprise/basic verifiers submit many hashes per call. Reuses verifyByHash's full report per hash — no shortcuts on the recomputed guarantees.
  async verifyBulk(hashes: string[]) {
    const results = await Promise.all(
      hashes.map(async (hash) => ({
        hash,
        result: await this.verifyByHash(hash),
      })),
    );
    return results;
  }

  async verifyByToken(token: string) {
    const link = await this.prisma.sharedLink.findUnique({
      where: { urlToken: token },
      include: { document: { include: INCLUDE } },
    });
    const now = new Date();
    if (
      !link ||
      !link.isActive ||
      (link.expiresAt !== null && link.expiresAt < now)
    ) {
      return this.notFound();
    }
    // Atomic view claim: the cap is re-checked under the row lock, so concurrent views
    // cannot exceed maxViews (TOCTOU-safe) — a plain read-then-increment could.
    const where: Prisma.SharedLinkWhereInput = { id: link.id, isActive: true };
    if (link.expiresAt !== null) where.expiresAt = { gt: now };
    if (link.maxViews !== null) where.views = { lt: link.maxViews };
    const claimed = await this.prisma.sharedLink.updateMany({
      where,
      data: { views: { increment: 1 } },
    });
    if (claimed.count === 0) return this.notFound();
    // In-app heads-up to the holder that their shared document was viewed (best-effort).
    await this.notifications
      .notify(
        link.document.holderId,
        'LINK_VIEWED',
        'Your shared document was viewed',
        `A ${TYPE_LABEL[link.document.type] ?? 'document'} you shared was just opened by a verifier.`,
      )
      .catch(() => undefined);
    // The holder deliberately shared THIS document via a link, so full content is shown.
    return this.present(link.document, 'shared');
  }

  private async present(doc: VerifiableDocument, disclosure: Disclosure) {
    const now = new Date();
    const checks: Check[] = [];

    // 1. Issued record — a stale hash from a rejected DRAFT must not read as valid.
    const isIssued = ['ISSUED', 'ANCHORED', 'REVOKED', 'EXPIRED'].includes(
      doc.status,
    );
    checks.push({
      key: 'exists',
      label: 'Document on record',
      status: isIssued ? 'pass' : 'fail',
      detail: isIssued
        ? `Issued by ${doc.organization.name}.`
        : 'This document has not been issued.',
    });

    // 2. Content integrity — recompute the R4 hash from content + salt.
    const integrityOk =
      !!doc.salt &&
      !!doc.documentHash &&
      hashDocument(doc.contentJson, doc.salt) === doc.documentHash;
    checks.push({
      key: 'integrity',
      label: 'Content integrity',
      status: integrityOk ? 'pass' : 'fail',
      detail: integrityOk
        ? 'Content matches its cryptographic hash.'
        : doc.salt
          ? 'Content does not match the recorded hash.'
          : 'Original content is unavailable.',
    });

    // 3 & 4. RS256 signatures verified against the org public key. Each co-signature is
    // over a distinct role+identity statement (C1), so they attest two separate acts.
    const issuerOk = await this.verifySignature(
      doc,
      doc.managerSignature,
      'MANAGER',
      doc.signerMemberId,
    );
    checks.push({
      key: 'issuerSignature',
      label: 'Issuer signature',
      status: issuerOk ? 'pass' : 'fail',
      detail: issuerOk
        ? 'Signed by the issuing manager.'
        : 'Issuer signature could not be verified.',
    });
    const approverOk = await this.verifySignature(
      doc,
      doc.hrSignature,
      'HR',
      doc.approverMemberId,
    );
    checks.push({
      key: 'approverSignature',
      label: 'Approver signature',
      status: approverOk ? 'pass' : 'fail',
      detail: approverOk
        ? 'Co-signed by HR.'
        : 'Approver signature could not be verified.',
    });

    // 5. Blockchain anchor — Merkle proof reconciles to a root that exists on-chain.
    let anchor: VerificationAnchor | null = null;
    let anchorStatus: CheckStatus = 'pending';
    let anchorDetail = 'Awaiting the next on-chain anchoring batch.';
    if (doc.merkleProof && doc.documentHash) {
      const root = doc.merkleProof.merkleRoot;
      const proof = doc.merkleProof.proofPath as unknown as MerkleProofStep[];
      const onChain = await this.blockchain.verifyRoot(root.rootHash);
      const ok =
        verifyMerkleProof(doc.documentHash, proof, root.rootHash) &&
        onChain.exists;
      anchorStatus = ok ? 'pass' : 'fail';
      anchorDetail = ok
        ? `Anchored on-chain in block ${root.polygonBlockNumber ?? '—'}.`
        : 'Merkle proof did not reconcile with the anchored root.';
      anchor = {
        rootHash: root.rootHash,
        txHash: root.polygonTxHash,
        blockNumber: root.polygonBlockNumber
          ? Number(root.polygonBlockNumber)
          : null,
        anchoredAt: root.anchoredAt,
      };
    }
    checks.push({
      key: 'anchor',
      label: 'Blockchain anchor',
      status: anchorStatus,
      detail: anchorDetail,
    });

    // 6. Revocation/validity — DB is authoritative (R7); on-chain flag is secondary.
    const revoked = doc.status === 'REVOKED' || doc.revokedAt !== null;
    const expired = !revoked && doc.expiresAt !== null && doc.expiresAt < now;
    let statusDetail = 'Active — not revoked or expired.';
    if (revoked) {
      statusDetail = `Revoked${doc.revokedAt ? ` on ${isoDate(doc.revokedAt)}` : ''}${
        doc.revocationReasonText ? `: ${doc.revocationReasonText}` : ''
      }.`;
    } else if (expired) {
      statusDetail = `Expired on ${isoDate(doc.expiresAt as Date)}.`;
    } else if (
      doc.documentHash &&
      (await this.blockchain.isRevoked(doc.documentHash)).revoked
    ) {
      statusDetail += ' (On-chain revocation flag present.)';
    }
    checks.push({
      key: 'status',
      label: 'Revocation status',
      status: revoked || expired ? 'fail' : 'pass',
      detail: statusDetail,
    });

    // A document is fully valid once it is issued, hash-intact, and dual-signed. On-chain
    // anchoring happens in the daily batch, so between issuance and that batch the anchor
    // is legitimately 'pending' — that is VERIFIED_PENDING_ANCHOR, NOT invalid (B1).
    const coreOk = isIssued && integrityOk && issuerOk && approverOk;
    let verdict: Verdict;
    if (revoked) verdict = 'REVOKED';
    else if (expired) verdict = 'EXPIRED';
    else if (coreOk && anchorStatus === 'pass') verdict = 'VERIFIED';
    else if (coreOk && anchorStatus === 'pending')
      verdict = 'VERIFIED_PENDING_ANCHOR';
    else verdict = 'INVALID';

    // Audit every public verification (PRD: COMPLIANCE tier, 7-year retention).
    await this.writeAuditLog(doc.id, verdict);

    return {
      verdict,
      anchored: anchorStatus === 'pass',
      // Withhold the document body for anything not actually issued — a non-issued
      // (e.g. rejected-draft) record reads as INVALID and must not disclose content/PII.
      document: isIssued
        ? {
            type: doc.type,
            status: doc.status,
            organizationName: doc.organization.name,
            // Anonymous salary lookups don't disclose whose salary it is; a holder-shared
            // link and every other document type still show the name.
            holderName:
              disclosure === 'public' && doc.type === SALARY_PROOF_TYPE
                ? null
                : doc.holder.fullName,
            issuedAt: doc.issuedAt,
            expiresAt: doc.expiresAt,
            documentHash: doc.documentHash,
            version: doc.version,
            content: this.publicContent(doc.contentJson, doc.type, disclosure),
          }
        : null,
      anchor,
      revocation: revoked
        ? {
            revokedAt: doc.revokedAt,
            code: doc.revocationReasonCode,
            reason: doc.revocationReasonText,
          }
        : null,
      checks,
    };
  }

  // Public ('public') hash lookups expose only the per-type allow-listed scalar fields
  // (D2/B6) — never salary paise, PAN/UAN, or personal contact. A holder-shared link
  // ('shared') opts into full disclosure of that one document.
  private publicContent(
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
    const root = contentJson as Record<string, unknown>;
    // New documents store the flat subject; tolerate the legacy nested shape too.
    const subject =
      root.credentialSubject &&
      typeof root.credentialSubject === 'object' &&
      !Array.isArray(root.credentialSubject)
        ? (root.credentialSubject as Record<string, unknown>)
        : root;
    const allow =
      disclosure === 'public' ? new Set(PUBLIC_SUBJECT_FIELDS[type]) : null;
    const out: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(subject)) {
      if (allow && !allow.has(key)) continue;
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        out[key] = value;
      }
    }
    return out;
  }

  // Each co-signature is over a role+identity statement (C1), recomputed here from the
  // stored signer/approver member ids — so a manager sig and an HR sig are distinct acts.
  private async verifySignature(
    doc: VerifiableDocument,
    signature: string | null,
    role: 'MANAGER' | 'HR',
    memberId: string | null,
  ): Promise<boolean> {
    // Verify against the key recorded WITH the signature, not the org's current one. They
    // are the same key until an org is ever re-keyed; after that, falling back to the
    // current key would report every previously issued document as forged. The fallback
    // covers rows signed before that column existed and never backfilled.
    const publicKeyPem =
      doc.signingPublicKeyPem ?? doc.organization.publicKeyPem;
    if (!signature || !doc.documentHash || !publicKeyPem || !memberId)
      return false;
    try {
      return await this.kms.verify(
        publicKeyPem,
        signingStatementHash(doc.documentHash, role, memberId),
        signature,
      );
    } catch {
      return false;
    }
  }

  // PRD: every public verification writes a COMPLIANCE-tier audit log retained
  // for 7 years. Best-effort — a failed log write must never break verification.
  private async writeAuditLog(
    documentId: string,
    verdict: Verdict,
  ): Promise<void> {
    try {
      const passed =
        verdict === 'VERIFIED' || verdict === 'VERIFIED_PENDING_ANCHOR';
      await this.prisma.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: passed ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_CHECK_FAILED',
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

  private notFound() {
    return {
      verdict: 'NOT_FOUND' as Verdict,
      anchored: false,
      document: null,
      anchor: null,
      revocation: null,
      checks: [] as Check[],
    };
  }
}

export interface VerificationAnchor {
  rootHash: string;
  txHash: string | null;
  blockNumber: number | null;
  anchoredAt: Date | null;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
