import type { DocumentDetail } from '@/features/document/types'
import { truncateHash } from '@/lib/format'

// The server stamps referenceNumber (e.g. TECHCO/EXP/2026/ABC123) into the signed content at signing, so only signed documents have one. Earlier, the record id is the only identifier a holder can quote.
export function documentReference(document: DocumentDetail): string {
  const reference = document.contentJson?.referenceNumber
  if (typeof reference === 'string' && reference.trim() !== '') return reference
  return truncateHash(document.id, 8, 4)
}
