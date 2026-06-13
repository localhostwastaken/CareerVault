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
  merkleStatus: 'PENDING_BATCH' | 'ANCHORED' | null
  renderedPdfUrl: string | null
  createdAt: string
  updatedAt: string
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
