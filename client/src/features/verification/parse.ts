// Share tokens are 48 hex chars, document hashes are SHA-256 (64 hex). Shared by the
// verification page and the landing-page teaser so the two can never disagree.
const HASH_RE = /^[0-9a-f]{64}$/i
const TOKEN_RE = /^[0-9a-f]{48}$/i

export type VerifyMode = 'token' | 'hash'

export const VERIFY_LENGTH: Record<VerifyMode, number> = { token: 48, hash: 64 }

export function isValidReference(value: string, mode: VerifyMode): boolean {
  const trimmed = value.trim()
  return mode === 'hash' ? HASH_RE.test(trimmed) : TOKEN_RE.test(trimmed)
}

/** Route for a reference, or null when it matches neither shape. */
export function verifyPath(value: string): string | null {
  const trimmed = value.trim()
  if (HASH_RE.test(trimmed)) return `/verify/hash/${trimmed.toLowerCase()}`
  if (TOKEN_RE.test(trimmed)) return `/verify/${trimmed}`
  return null
}

/** Pulls the reference out of a pasted full share URL, or returns the input unchanged. */
export function extractReference(input: string): string {
  const trimmed = input.trim()
  const match = trimmed.match(/\/verify\/(?:hash\/)?([0-9a-f]{48,64})\/?$/i)
  return match ? match[1] : trimmed
}
