/**
 * Credential evidence shown beside a talent match: how many of the holder's credentials
 * are currently valid, how many of those are anchored, from how many distinct issuers,
 * and the newest issue date.
 *
 * Only counts and a date — never issuer names. Discovery is consented but should not
 * disclose a candidate's employers before they choose to share documents (POC readiness
 * review, E2). Callers must scope the input rows exactly like the match's skills (R6).
 */
export interface CredentialEvidence {
  verifiedCredentials: number;
  anchoredCredentials: number;
  issuers: number;
  latestIssuedAt: string | null;
}

export interface CredentialEvidenceRow {
  holderId: string;
  status: string;
  organizationId: string;
  issuedAt: Date | null;
  expiresAt: Date | null;
}

export const EVIDENCE_STATUSES = ['ISSUED', 'ANCHORED'] as const;

const EMPTY: CredentialEvidence = {
  verifiedCredentials: 0,
  anchoredCredentials: 0,
  issuers: 0,
  latestIssuedAt: null,
};

// The expiry cron flips lapsed documents to EXPIRED nightly; until it runs, verification
// already treats them as expired, so the evidence must too.
export function summarizeCredentials(
  rows: CredentialEvidenceRow[],
  now: Date,
): Map<string, CredentialEvidence> {
  const byHolder = new Map<
    string,
    { evidence: CredentialEvidence; orgs: Set<string> }
  >();
  for (const row of rows) {
    if (
      !EVIDENCE_STATUSES.includes(
        row.status as (typeof EVIDENCE_STATUSES)[number],
      )
    )
      continue;
    if (row.expiresAt && row.expiresAt.getTime() <= now.getTime()) continue;
    const entry = byHolder.get(row.holderId) ?? {
      evidence: { ...EMPTY },
      orgs: new Set<string>(),
    };
    entry.evidence.verifiedCredentials += 1;
    if (row.status === 'ANCHORED') entry.evidence.anchoredCredentials += 1;
    entry.orgs.add(row.organizationId);
    const issued = row.issuedAt?.toISOString() ?? null;
    if (
      issued &&
      (!entry.evidence.latestIssuedAt || issued > entry.evidence.latestIssuedAt)
    ) {
      entry.evidence.latestIssuedAt = issued;
    }
    byHolder.set(row.holderId, entry);
  }
  const result = new Map<string, CredentialEvidence>();
  for (const [holderId, { evidence, orgs }] of byHolder) {
    result.set(holderId, { ...evidence, issuers: orgs.size });
  }
  return result;
}

export function emptyEvidence(): CredentialEvidence {
  return { ...EMPTY };
}
