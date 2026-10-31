/**
 * Document integrity helpers — the ONLY place document hashes, employee seals and signing
 * statements are computed (R4, R3). The bytes themselves come from document-bytes.ts.
 *
 *   B            = documentBytes(id, type, orgId, holderId, subject, salt)
 *   documentHash = SHA-256(B)                        lowercase hex; the Merkle leaf
 *   seal         = HMAC-SHA256(employeeKey, B)       lowercase hex; one per signer
 *   statement    = SHA-256(statementBytes(documentHash, seal, role, memberId, keyId))
 *                  which the org's RSA-2048 key signs (RS256)
 *
 * The salt is randomBytes(32), stored as 64 lowercase hex chars, and enters B as its 32 raw
 * bytes. Without it a guessable subject (a salary band, a designation) could be confirmed
 * by hashing guesses; with it the hash reveals nothing.
 */
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import {
  documentBytes,
  statementBytes,
  type DocumentIdentity,
  type SigningStatement,
} from '../crypto/document-bytes.js';

export function generateSalt(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hashDocument(
  identity: DocumentIdentity,
  subject: unknown,
  salt: string,
): string {
  return sha256Hex(documentBytes(identity, subject, salt));
}

/** HMAC-SHA256 of the document bytes under one signer's employee key. */
export function employeeSeal(key: Buffer, bytes: Buffer): string {
  return createHmac('sha256', key).update(bytes).digest('hex');
}

/** Constant-time comparison of two hex seals, so a mismatch leaks no timing signal. */
export function sealsMatch(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(actual, 'hex');
  return a.length === 32 && a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Normalize a credential subject before it is stored, hashed, and signed.
 *
 * The hash covers the EXACT stored bytes, so the signed payload must be
 * deterministic: two logically-equal subjects (one with `field: null`, one that
 * omits it) must serialize identically or the hash diverges. We recursively drop
 * `undefined`/`null`/`''`, empty arrays, and empty objects, while preserving `0`
 * and `false` (meaningful values). Key ordering is handled later by
 * the byte serializer (document-bytes.ts).
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
 * The manager and HR never sign the bare document hash: that would give two byte-identical
 * RS256 signatures under deterministic PKCS#1 padding. Each signs a statement binding the
 * hash to their own seal, role, membership and employee key, so the two co-signatures are
 * distinct acts, and each names the key that sealed it.
 */
export function signingStatementHash(statement: SigningStatement): string {
  return sha256Hex(statementBytes(statement));
}
