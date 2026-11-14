import { describe, expect, it } from 'vitest'
import { documentReference } from '@/features/document/reference'
import type { DocumentDetail } from '@/features/document/types'

// A recommendation letter carries no reference number by design; lists used to fall back
// to a hash fragment of its id, which reads as noise on screen.
const doc = (contentJson: Record<string, unknown> | null) =>
  ({ id: 'ec13b47a-0000-4000-8000-00000000fdd7', contentJson }) as unknown as DocumentDetail

describe('documentReference', () => {
  it('returns the signed reference number', () => {
    expect(documentReference(doc({ referenceNumber: 'TECHCO/EXP/2026/K7M2P9' }))).toBe('TECHCO/EXP/2026/K7M2P9')
  })

  it('returns null when the document has no reference number', () => {
    expect(documentReference(doc({ candidateName: 'Alice Holder' }))).toBeNull()
  })
})
