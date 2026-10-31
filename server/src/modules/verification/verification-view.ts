import type { AnchorBadge } from './anchor-badge.js';

// The public verification contract: everything a verifier is told, and nothing else. No
// hash, salt, seal, signature, key, Merkle root or algorithm name crosses this boundary. The
// server recomputes all of them and reports only what the result means.

export type Verdict =
  | 'VERIFIED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'INVALID'
  | 'NOT_FOUND';

export type CheckStatus = 'pass' | 'fail';

export interface Check {
  key: 'exists' | 'integrity' | 'managerSignature' | 'hrSignature' | 'status';
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface RoleSignature {
  role: 'MANAGER' | 'HR';
  signerName: string | null;
  isValid: boolean;
}

export interface PublicVerification {
  verified: boolean;
  verdict: Verdict;
  // Lets a verifier tell an erased credential from a tampered one; the verdict can't.
  erased: boolean;
  issuer: { name: string; domain: string } | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  document: {
    documentId: string;
    type: string;
    status: string;
    holderName: string | null;
    fields: Record<string, string | number | boolean>;
  } | null;
  roleSignatures: RoleSignature[];
  checks: Check[];
  revocation: {
    revokedAt: Date | null;
    code: string | null;
    reason: string | null;
  } | null;
  anchor: AnchorBadge;
}

const NO_ANCHOR: AnchorBadge = {
  status: 'pending',
  network: null,
  explorerTxUrl: null,
  anchoredAt: null,
};

export function notFoundView(): PublicVerification {
  return {
    verified: false,
    verdict: 'NOT_FOUND',
    erased: false,
    issuer: null,
    issuedAt: null,
    expiresAt: null,
    document: null,
    roleSignatures: [],
    checks: [],
    revocation: null,
    anchor: NO_ANCHOR,
  };
}

// A record whose sealed fields will not open, or that strict mode refuses: fail closed as
// INVALID and disclose nothing about it.
export function unreadableView(): PublicVerification {
  return {
    ...notFoundView(),
    verdict: 'INVALID',
    checks: [
      {
        key: 'integrity',
        label: 'Content unchanged since signing',
        status: 'fail',
        detail:
          'The stored record failed its integrity checks and cannot be verified.',
      },
    ],
  };
}
