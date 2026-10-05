export type DocumentStatus =
  | 'REQUESTED'
  | 'DRAFT'
  | 'PENDING_HR'
  | 'ISSUED'
  | 'ANCHORED'
  | 'REVOKED'
  | 'EXPIRED'

export type DocumentType = 'EXPERIENCE_LETTER' | 'LETTER_OF_RECOMMENDATION' | 'SALARY_PROOF'

export type RevocationCode = 'ADMINISTRATIVE_ERROR' | 'POLICY_VIOLATION' | 'ISSUED_IN_ERROR'

export interface DocumentDetail {
  id: string
  type: DocumentType
  status: DocumentStatus
  holderId: string
  holderName: string
  holderEmail: string
  organizationId: string
  organizationName: string
  signerName: string | null
  contentJson: Record<string, unknown>
  documentHash: string | null
  version: number
  expiresAt: string | null
  issuedAt: string | null
  revokedAt: string | null
  revocationReasonCode: RevocationCode | null
  revocationReasonText: string | null
  hasManagerSignature: boolean
  hasHrSignature: boolean
  /** Manager the request is assigned to. Null until one is assigned. */
  assignedManagerName: string | null
  /** HR member who approved. Null until approval. */
  approverName: string | null
  merkleStatus: 'PENDING_BATCH' | 'ANCHORED' | null
  /** The batch that anchored this document. Optional: absent from servers that predate it. */
  anchor?: DocumentAnchor | null
  renderedPdfUrl: string | null
  createdAt: string
  updatedAt: string
}

// Mirrors server/src/modules/document/document-anchor.ts. A null chainId is the local
// simulator, which has no explorer, so every URL is null there.
export interface DocumentAnchor {
  merkleRoot: string
  txHash: string | null
  blockNumber: number | null
  anchoredAt: string | null
  chainId: number | null
  network: string
  contractAddress: string | null
  explorerTxUrl: string | null
  explorerContractUrl: string | null
  explorerBlockUrl: string | null
  proofLength: number
}

export interface RequestDocumentRequest {
  type: DocumentType
  organizationId: string
  managerUserId?: string
  notes?: string
  enableSkillExtraction?: boolean
}

export interface SignDocumentRequest {
  contentJson: Record<string, unknown>
}

export interface ApproveRequest {
  notes?: string
}

export interface RejectRequest {
  reason: string
}

export interface RevokeRequest {
  code: RevocationCode
  reason?: string
}

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  EXPERIENCE_LETTER: 'Experience Letter',
  LETTER_OF_RECOMMENDATION: 'Letter of Recommendation',
  SALARY_PROOF: 'Salary Proof',
}
