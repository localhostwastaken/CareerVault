/**
 * Document integrity helpers — the ONLY place document hashes are computed (R4).
 *
 * R4 spec: document_hash = SHA-256( JCS(content_json) ++ salt ), lowercase hex.
 *   - JCS = RFC 8785 canonical JSON (deterministic key ordering).
 *   - salt = 32-byte random hex, appended to the canonical string as UTF-8.
 *
 * Worked example:
 *   content = { b: 1, a: 2 }   ->  JCS = '{"a":2,"b":1}'
 *   salt    = 'ab12...' (64 hex chars)
 *   hash    = sha256('{"a":2,"b":1}' + 'ab12...')  (hex)
 */
import { createHash, randomBytes } from 'node:crypto';
import canonicalize from 'canonicalize';

export function generateSalt(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function canonicalizeJson(value: unknown): string {
  const json = canonicalize(value as object);
  if (json === undefined) {
    throw new Error('Value is not JCS-canonicalizable');
  }
  return json;
}

export function hashDocument(contentJson: unknown, salt: string): string {
  return createHash('sha256')
    .update(canonicalizeJson(contentJson) + salt, 'utf8')
    .digest('hex');
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Normalize a credential subject before it is stored, hashed, and signed.
 *
 * The hash covers the EXACT stored bytes, so the signed payload must be
 * deterministic: two logically-equal subjects (one with `field: null`, one that
 * omits it) must serialize identically or the hash diverges. We recursively drop
 * `undefined`/`null`/`''`, empty arrays, and empty objects, while preserving `0`
 * and `false` (meaningful values). Canonical key ordering is handled later by JCS.
 */
export function normalizeSubject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((v) => normalizeSubject(v))
      .filter((v) => v !== undefined && v !== null && v !== '');
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      const v = normalizeSubject(raw);
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (
        typeof v === 'object' &&
        !Array.isArray(v) &&
        Object.keys(v).length === 0
      )
        continue;
      out[key] = v;
    }
    return out;
  }
  return value;
}

/**
 * Per-role signing statement (C1 — dual-signature integrity).
 *
 * The manager and HR do NOT sign the bare document hash (that would produce two
 * byte-identical RS256 signatures under deterministic PKCS#1 padding). Each signs
 * a DISTINCT statement that binds the document hash to their role and membership,
 * so the two signatures differ and cryptographically attest separation of duties.
 * Verification recomputes this statement from the stored signer/approver member ids.
 */
export function signingStatementHash(
  documentHash: string,
  role: 'MANAGER' | 'HR',
  memberId: string,
): string {
  return sha256Hex(canonicalizeJson({ v: 1, documentHash, role, memberId }));
}
