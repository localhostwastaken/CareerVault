import type { DocumentDetail } from '@/features/document/types'

// The server stamps referenceNumber (e.g. TECHCO/EXP/2026/ABC123) into the signed content at
// signing, for experience letters and salary proofs only. Anything else has no human
// reference, and a list shows nothing rather than a hash fragment of the record id.
export function documentReference(document: DocumentDetail): string | null {
  const reference = document.contentJson?.referenceNumber
  if (typeof reference === 'string' && reference.trim() !== '') return reference
  return null
}
