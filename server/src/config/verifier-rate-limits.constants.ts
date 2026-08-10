import type { VerifierKeyTier } from '../generated/prisma/enums.js';

// Bulk Verification API per-tier throughput (R6). Enforced in ApiKeyGuard.
export const VERIFIER_TIER_LIMITS: Record<
  'BASIC' | 'ENTERPRISE',
  { limit: number; windowMs: number }
> = {
  BASIC: { limit: 100, windowMs: 60_000 },
  ENTERPRISE: { limit: 1000, windowMs: 60_000 },
};

// Monthly per-key request cap for the Bulk Verification API (R6), enforced per request in
// ApiKeyGuard against VerifierApiKey.monthlyUsageCount. The UNIT is verification API
// requests (one HTTP call, which may batch up to MAX_BULK_VERIFY_HASHES hashes) — the plan
// perk copy in billing.constants.ts advertises these same numbers with that same wording.
export const VERIFIER_MONTHLY_REQUEST_CAP: Record<VerifierKeyTier, number> = {
  BASIC: 1_000,
  ENTERPRISE: 50_000,
};

export const MAX_BULK_VERIFY_HASHES = 100;
