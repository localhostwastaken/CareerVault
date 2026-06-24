import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { KeyManagementService } from '../../services/key-management/key-management.service.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { hashDocument } from '../../common/utils/crypto.util.js';
import {
  verifyMerkleProof,
  type MerkleProofStep,
} from '../../common/utils/merkle.util.js';
import type { Prisma } from '../../generated/prisma/client.js';

const TYPE_LABEL: Record<string, string> = {
  EXPERIENCE_LETTER: 'experience letter',
  LETTER_OF_RECOMMENDATION: 'letter of recommendation',
  SALARY_PROOF: 'salary proof',
};

export type CheckStatus = 'pass' | 'fail' | 'pending';
export type Verdict =
  | 'VERIFIED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'INVALID'
  | 'NOT_FOUND';

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
    return doc ? this.present(doc) : this.notFound();
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
    return this.present(link.document);
  }

  private async present(doc: VerifiableDocument) {
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

    // 3 & 4. RS256 signatures verified against the org public key.
    const issuerOk = await this.verifySignature(doc, doc.managerSignature);
    checks.push({
      key: 'issuerSignature',
      label: 'Issuer signature',
      status: issuerOk ? 'pass' : 'fail',
      detail: issuerOk
        ? 'Signed by the issuing manager.'
        : 'Issuer signature could not be verified.',
    });
    const approverOk = await this.verifySignature(doc, doc.hrSignature);
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

    let verdict: Verdict;
    if (revoked) verdict = 'REVOKED';
    else if (expired) verdict = 'EXPIRED';
    else if (
      isIssued &&
      integrityOk &&
      issuerOk &&
      approverOk &&
      anchorStatus === 'pass'
    )
      verdict = 'VERIFIED';
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
            holderName: doc.holder.fullName,
            issuedAt: doc.issuedAt,
            expiresAt: doc.expiresAt,
            documentHash: doc.documentHash,
            version: doc.version,
            content: this.publicContent(doc.contentJson),
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

  // Only scalar credential fields are exposed publicly — the same set the issued PDF
  // renders — so the API never discloses more than the document itself already shows.
  private publicContent(
    contentJson: Prisma.JsonValue,
  ): Record<string, string | number | boolean> {
    if (
      !contentJson ||
      typeof contentJson !== 'object' ||
      Array.isArray(contentJson)
    )
      return {};
    const root = contentJson as Record<string, unknown>;
    const subject =
      root.credentialSubject &&
      typeof root.credentialSubject === 'object' &&
      !Array.isArray(root.credentialSubject)
        ? (root.credentialSubject as Record<string, unknown>)
        : root;
    const out: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(subject)) {
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

  private async verifySignature(
    doc: VerifiableDocument,
    signature: string | null,
  ): Promise<boolean> {
    if (!signature || !doc.documentHash || !doc.organization.publicKeyPem)
      return false;
    try {
      return await this.kms.verify(
        doc.organization.publicKeyPem,
        doc.documentHash,
        signature,
      );
    } catch {
      return false;
    }
  }

  // PRD: every public verification writes a COMPLIANCE-tier audit log retained
  // for 7 years. Best-effort — a failed log write must never break verification.
  private async writeAuditLog(documentId: string, verdict: Verdict): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: verdict === 'VERIFIED' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_CHECK_FAILED',
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
