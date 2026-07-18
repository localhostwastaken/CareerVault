export type VerifierKeyTier = 'BASIC' | 'ENTERPRISE'
export type VerifierKeyStatus = 'ACTIVE' | 'REVOKED'

export interface VerifierKey {
  id: string
  name: string | null
  tier: VerifierKeyTier
  status: VerifierKeyStatus
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export interface CreatedVerifierKey extends VerifierKey {
  apiKey: string
}
