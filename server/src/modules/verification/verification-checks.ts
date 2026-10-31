import { documentBytes } from '../../common/crypto/document-bytes.js';
import {
  employeeSeal,
  sealsMatch,
  sha256Hex,
  signingStatementHash,
} from '../../common/utils/crypto.util.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { KeyManagementService } from '../../services/key-management/key-management.service.js';
import type { EmployeeKeyService } from '../employee-key/employee-key.service.js';
import { documentIdentity } from '../document/document-seal.js';
import { ERASURE_DETAIL, isErased } from './is-erased.js';
import type { Check, RoleSignature, Verdict } from './verification-view.js';

export const VERIFY_INCLUDE = {
  organization: { select: { name: true, domain: true, publicKeyPem: true } },
  holder: { select: { fullName: true } },
  signerMember: {
    select: { userId: true, user: { select: { fullName: true } } },
  },
  approverMember: {
    select: { userId: true, user: { select: { fullName: true } } },
  },
  managerKey: true,
  hrKey: true,
  merkleProof: { include: { merkleRoot: true } },
} satisfies Prisma.DocumentInclude;

export type VerifiableDocument = Prisma.DocumentGetPayload<{
  include: typeof VERIFY_INCLUDE;
}>;

export interface CheckDeps {
  kms: KeyManagementService;
  employeeKeys: EmployeeKeyService;
}

export interface CheckOutcome {
  verdict: Verdict;
  isIssued: boolean;
  erased: boolean;
  revoked: boolean;
  checks: Check[];
  roleSignatures: RoleSignature[];
}

const ISSUED = ['ISSUED', 'ANCHORED', 'REVOKED', 'EXPIRED'];

// The checks behind every public verification, recomputed from the stored record each time
// and never read from a stored "valid" flag:
//   1. an issued document exists                     (a rejected draft's hash never passes)
//   2. SHA-256 of the rebuilt bytes = documentHash   (content, salt and identity untouched)
//   3/4. per signer: HMAC seal under their OWN pinned employee key matches the bytes, and
//        the org RSA signature over (hash, seal, role, member, key) verifies
//   5. not revoked or expired                        (the register is authoritative, R7)
// The chain is not here: it is a badge beside the verdict, never a condition of it.
export async function runChecks(
  doc: VerifiableDocument,
  deps: CheckDeps,
  now: Date,
): Promise<CheckOutcome> {
  const isIssued = ISSUED.includes(doc.status);
  const erased = isIssued && isErased(doc);
  const bytes = rebuildBytes(doc);
  const integrityOk = bytes !== null && sha256Hex(bytes) === doc.documentHash;

  const [managerOk, hrOk] = await Promise.all([
    signerValid(doc, 'MANAGER', bytes, deps),
    signerValid(doc, 'HR', bytes, deps),
  ]);

  const revoked = doc.status === 'REVOKED' || doc.revokedAt !== null;
  const expired = !revoked && doc.expiresAt !== null && doc.expiresAt < now;

  const checks: Check[] = [
    {
      key: 'exists',
      label: 'Issued document on record',
      status: isIssued ? 'pass' : 'fail',
      detail: isIssued
        ? `Issued by ${doc.organization.name}.`
        : 'This document has not been issued.',
    },
    {
      key: 'integrity',
      label: 'Content unchanged since signing',
      status: integrityOk ? 'pass' : 'fail',
      detail: erased
        ? ERASURE_DETAIL
        : integrityOk
          ? 'Every field is exactly as it was when it was signed.'
          : 'The content does not match what was signed.',
    },
    signerCheck(
      'managerSignature',
      'Manager signature',
      'manager',
      managerOk,
      erased,
    ),
    signerCheck('hrSignature', 'HR co-signature', 'HR approver', hrOk, erased),
    {
      key: 'status',
      label: 'Not revoked or expired',
      status: revoked || expired ? 'fail' : 'pass',
      detail: revoked
        ? 'The issuer has revoked this document.'
        : expired
          ? 'This document is past its expiry date.'
          : 'Active.',
    },
  ];

  const coreOk = isIssued && integrityOk && managerOk && hrOk;
  let verdict: Verdict = coreOk ? 'VERIFIED' : 'INVALID';
  if (revoked) verdict = 'REVOKED';
  else if (expired) verdict = 'EXPIRED';

  return {
    verdict,
    isIssued,
    erased,
    revoked,
    checks,
    roleSignatures: [
      {
        role: 'MANAGER',
        signerName: doc.signerMember?.user.fullName ?? null,
        isValid: managerOk,
      },
      {
        role: 'HR',
        signerName: doc.approverMember?.user.fullName ?? null,
        isValid: hrOk,
      },
    ],
  };
}

function signerCheck(
  key: 'managerSignature' | 'hrSignature',
  label: string,
  who: string,
  isValid: boolean,
  erased: boolean,
): Check {
  let detail = `Sealed with the ${who}'s own key and signed by the organisation.`;
  if (erased) detail = ERASURE_DETAIL;
  else if (!isValid)
    detail = `The ${who}'s signature does not match this document.`;
  return { key, label, status: isValid ? 'pass' : 'fail', detail };
}

// Null when there is nothing to rebuild (erased, or never signed) or the stored content
// cannot be serialized at all; either way integrity and both seals then fail.
function rebuildBytes(doc: VerifiableDocument): Buffer | null {
  if (!doc.salt || !doc.documentHash) return null;
  try {
    return documentBytes(documentIdentity(doc), doc.contentJson, doc.salt);
  } catch {
    return null;
  }
}

async function signerValid(
  doc: VerifiableDocument,
  role: 'MANAGER' | 'HR',
  bytes: Buffer | null,
  deps: CheckDeps,
): Promise<boolean> {
  const isManager = role === 'MANAGER';
  const signature = isManager ? doc.managerSignature : doc.hrSignature;
  const seal = isManager ? doc.managerSeal : doc.hrSeal;
  const keyRow = isManager ? doc.managerKey : doc.hrKey;
  const memberId = isManager ? doc.signerMemberId : doc.approverMemberId;
  const member = isManager ? doc.signerMember : doc.approverMember;
  // The key recorded WITH the signature, not the org's current one (signing-key rotation).
  const publicKeyPem = doc.signingPublicKeyPem ?? doc.organization.publicKeyPem;
  if (
    !bytes ||
    !doc.documentHash ||
    !signature ||
    !seal ||
    !keyRow ||
    !memberId ||
    !member ||
    !publicKeyPem
  )
    return false;
  // The sealing key must be the signing member's own, in this organisation: a seal under a
  // colleague's key is not this signer's act.
  if (
    keyRow.userId !== member.userId ||
    keyRow.organizationId !== doc.organizationId
  )
    return false;

  const key = await deps.employeeKeys.open(keyRow);
  if (!key) return false;
  const sealOk = sealsMatch(seal, employeeSeal(key, bytes));
  key.fill(0);
  if (!sealOk) return false;
  try {
    return await deps.kms.verify(
      publicKeyPem,
      signingStatementHash({
        documentHash: doc.documentHash,
        seal,
        role,
        memberId,
        employeeKeyId: keyRow.id,
      }),
      signature,
    );
  } catch {
    return false;
  }
}
