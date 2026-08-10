import type { VerifierKeyTier } from '../../../generated/prisma/enums.js';

// Public shape returned by the verifier-keys endpoints. Usage fields let the client render
// "X / cap this month" (R6 quota) without exposing the key hash.
export interface VerifierKeyResponse {
  id: string;
  name: string | null;
  tier: VerifierKeyTier;
  status: string;
  monthlyUsageCount: number;
  monthlyRequestCap: number;
  usageResetAt: Date | null;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

// Returned only by create(): the raw key is shown exactly once, at mint time.
export interface VerifierKeyCreatedResponse extends VerifierKeyResponse {
  apiKey: string;
}
