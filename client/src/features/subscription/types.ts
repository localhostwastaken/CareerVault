export type SubscriptionTier = 'HOLDER_PREMIUM' | 'VERIFIER_BASIC' | 'VERIFIER_ENTERPRISE'
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE'

export interface Subscription {
  id: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  startedAt: string | null
  currentPeriodEnd: string | null
  cancelledAt: string | null
}

export interface Plan {
  tier: SubscriptionTier
  label: string
  perks: string[]
  basePrice: number
  price: number
  discounted: boolean
}

export interface SubscribeResponse {
  checkout: { sessionId: string; checkoutUrl: string; amount: number }
}
