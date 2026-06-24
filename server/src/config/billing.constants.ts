// Billing rules (R5): one-time share-link fee + Stripe-billed user subscription tiers.
// Org tiers are promotional and live elsewhere; these are user-level prices in USD.

export type BillingTier =
  | 'HOLDER_PREMIUM'
  | 'VERIFIER_BASIC'
  | 'VERIFIER_ENTERPRISE';

export const ONE_TIME_LINK_PRICE = 1.99;

// Issuer-verifier discount: a verifier who is also a member of a verified org gets 50%
// off the VERIFIER_* tiers (HOLDER_PREMIUM never discounts).
export const ISSUER_VERIFIER_DISCOUNT = 0.5;

export interface PlanInfo {
  tier: BillingTier;
  label: string;
  price: number;
  perks: string[];
  verifierDiscountEligible: boolean;
}

export const PLANS: PlanInfo[] = [
  {
    tier: 'HOLDER_PREMIUM',
    label: 'Holder Premium',
    price: 9.99,
    perks: [
      'Unlimited free share links',
      'Priority verification support',
      'Early access to new features',
    ],
    verifierDiscountEligible: false,
  },
  {
    tier: 'VERIFIER_BASIC',
    label: 'Verifier Basic',
    price: 49,
    perks: ['Bulk verification', 'API access', 'Up to 1,000 checks / month'],
    verifierDiscountEligible: true,
  },
  {
    tier: 'VERIFIER_ENTERPRISE',
    label: 'Verifier Enterprise',
    price: 199,
    perks: [
      'Unlimited verifications',
      'Dedicated support',
      'SLA & audit exports',
    ],
    verifierDiscountEligible: true,
  },
];

export const PLAN_BY_TIER: Record<BillingTier, PlanInfo> = Object.fromEntries(
  PLANS.map((plan) => [plan.tier, plan]),
) as Record<BillingTier, PlanInfo>;

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
