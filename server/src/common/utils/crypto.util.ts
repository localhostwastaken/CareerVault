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
