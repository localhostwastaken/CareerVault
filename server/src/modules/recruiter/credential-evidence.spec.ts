import {
  summarizeCredentials,
  type CredentialEvidenceRow,
} from './credential-evidence.js';

const NOW = new Date('2026-09-25T00:00:00Z');
const row = (over: Partial<CredentialEvidenceRow>): CredentialEvidenceRow => ({
  holderId: 'h1',
  status: 'ISSUED',
  organizationId: 'org-a',
  issuedAt: new Date('2026-06-01T00:00:00Z'),
  expiresAt: null,
  ...over,
});

describe('summarizeCredentials', () => {
  it('counts valid credentials, anchored ones, distinct issuers and the newest issue date', () => {
    const out = summarizeCredentials(
      [
        row({ status: 'ANCHORED' }),
        row({
          organizationId: 'org-b',
          issuedAt: new Date('2026-08-15T00:00:00Z'),
        }),
        row({ status: 'ANCHORED', issuedAt: new Date('2026-03-01T00:00:00Z') }),
      ],
      NOW,
    );
    expect(out.get('h1')).toEqual({
      verifiedCredentials: 3,
      anchoredCredentials: 2,
      issuers: 2,
      latestIssuedAt: '2026-08-15T00:00:00.000Z',
    });
  });

  it('excludes credentials that are not issued, revoked, or already past expiry', () => {
    const out = summarizeCredentials(
      [
        row({ status: 'PENDING_HR' }),
        row({ status: 'REVOKED' }),
        row({ status: 'EXPIRED' }),
        // Still ISSUED in the database, but lapsed before the nightly cron flipped it.
        row({ expiresAt: new Date('2026-09-01T00:00:00Z') }),
      ],
      NOW,
    );
    expect(out.has('h1')).toBe(false);
  });

  it('keeps holders separate', () => {
    const out = summarizeCredentials(
      [row({ holderId: 'h1' }), row({ holderId: 'h2', status: 'ANCHORED' })],
      NOW,
    );
    expect(out.get('h1')?.verifiedCredentials).toBe(1);
    expect(out.get('h2')?.anchoredCredentials).toBe(1);
  });
});
