export interface Organization {
  id: string
  name: string
  domain: string
  dnsToken: string
  isVerified: boolean
  verifiedAt: string | null
  verificationAttempts: number
  subscriptionTier: 'FREE' | 'STARTER' | 'ENTERPRISE'
  logoUrl: string | null
  rootDid: string | null
  createdAt: string
}

export interface CreateOrgResponse extends Organization {
  verificationTxtRecord: string
}

export interface CreateOrgRequest {
  name: string
  domain: string
}

export interface UpdateOrgRequest {
  name?: string
  logoUrl?: string
}
