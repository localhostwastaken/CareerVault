import type { DocumentStatus, DocumentType } from '@/features/document/types'

export type Verdict = 'VERIFIED' | 'REVOKED' | 'EXPIRED' | 'INVALID' | 'NOT_FOUND'
export type CheckStatus = 'pass' | 'fail' | 'pending'

export interface VerificationCheck {
  key: string
  label: string
  status: CheckStatus
  detail: string
}

export interface VerificationAnchor {
  rootHash: string
  txHash: string | null
  blockNumber: number | null
  anchoredAt: string | null
}

export interface VerificationDocument {
  type: DocumentType
  status: DocumentStatus
  organizationName: string
  holderName: string
  issuedAt: string | null
  expiresAt: string | null
  documentHash: string | null
  version: number
  content: Record<string, unknown>
}

export interface VerificationResult {
  verdict: Verdict
  anchored: boolean
  document: VerificationDocument | null
  anchor: VerificationAnchor | null
  revocation: { revokedAt: string | null; code: string | null; reason: string | null } | null
  checks: VerificationCheck[]
}
