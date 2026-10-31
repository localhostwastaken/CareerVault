// Document IDs are UUIDs; share tokens are 48 hex chars. Shared by the verification page and
// the landing-page teaser so the two can never disagree.
const DOCUMENT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN_RE = /^[0-9a-f]{48}$/i

export type VerifyMode = 'document' | 'token'

export const VERIFY_LENGTH: Record<VerifyMode, number> = { document: 36, token: 48 }

export function isDocumentId(value: string): boolean {
  return DOCUMENT_ID_RE.test(value.trim())
}

export function isValidReference(value: string, mode: VerifyMode): boolean {
  const trimmed = value.trim()
  return mode === 'document' ? DOCUMENT_ID_RE.test(trimmed) : TOKEN_RE.test(trimmed)
}

/** Route for a reference, or null when it matches neither shape. */
export function verifyPath(value: string): string | null {
  const trimmed = value.trim()
  if (DOCUMENT_ID_RE.test(trimmed)) return `/verify/${trimmed.toLowerCase()}`
  if (TOKEN_RE.test(trimmed)) return `/verify/${trimmed}`
  return null
}

/** Pulls the reference out of a pasted full verification URL, or returns the input unchanged. */
export function extractReference(input: string): string {
  const trimmed = input.trim()
  const match = trimmed.match(/\/verify\/([0-9a-f-]{36,48})\/?$/i)
  return match ? match[1] : trimmed
}
