import type { DocumentType } from '@/features/document/types'

export interface ShareLink {
  id: string
  urlToken: string
  isPaid: boolean
  isActive: boolean
  views: number
  maxViews: number | null
  expiresAt: string | null
  createdAt: string
  documentType: DocumentType
  organizationName: string
}

export interface CheckoutInfo {
  sessionId: string
  checkoutUrl: string
  amount: number
}

export interface CreateShareLinkResponse {
  shareLink: ShareLink
  checkout: CheckoutInfo | null
}

export interface CreateShareLinkRequest {
  documentId: string
  maxViews?: number
  expiresInDays?: number
}
