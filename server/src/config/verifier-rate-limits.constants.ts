// Bulk Verification API per-tier throughput (R6). Enforced in ApiKeyGuard.
export const VERIFIER_TIER_LIMITS: Record<
  'BASIC' | 'ENTERPRISE',
  { limit: number; windowMs: number }
> = {
  BASIC: { limit: 100, windowMs: 60_000 },
  ENTERPRISE: { limit: 1000, windowMs: 60_000 },
};

export const MAX_BULK_VERIFY_HASHES = 100;
