import type { DocumentStatus, DocumentType } from '@/features/document/types'

// Mirrors server/src/modules/verification/verification-view.ts. The server sends verdicts,
// never cryptographic material: no hash, salt, seal, signature, key or Merkle root.
export type Verdict = 'VERIFIED' | 'REVOKED' | 'EXPIRED' | 'INVALID' | 'NOT_FOUND'
export type CheckStatus = 'pass' | 'fail'
export type AnchorStatus = 'anchored' | 'pending' | 'unconfirmed' | 'unavailable'

export interface VerificationCheck {
  key: string
  label: string
  status: CheckStatus
  detail: string
}

export interface RoleSignature {
  role: 'MANAGER' | 'HR'
  signerName: string | null
  isValid: boolean
}

export interface AnchorBadgeInfo {
  status: AnchorStatus
  network: string | null
  explorerTxUrl: string | null
  anchoredAt: string | null
}

export interface VerificationDocument {
  documentId: string
  type: DocumentType
  status: DocumentStatus
  // Null on an anonymous lookup of a salary proof: the public view withholds the name.
  holderName: string | null
  fields: Record<string, unknown>
}

export interface VerificationResult {
  verified: boolean
  verdict: Verdict
  // The holder exercised GDPR erasure: nothing of the content remains, so `document` is null.
  erased: boolean
  issuer: { name: string; domain: string } | null
  issuedAt: string | null
  expiresAt: string | null
  document: VerificationDocument | null
  roleSignatures: RoleSignature[]
  checks: VerificationCheck[]
  revocation: { revokedAt: string | null; code: string | null; reason: string | null } | null
  anchor: AnchorBadgeInfo
}
