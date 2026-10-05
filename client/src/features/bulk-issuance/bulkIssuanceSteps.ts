import type { ExplainerStep } from '@/components/shared/Explainer'

// bulk-issuance.service.ts: rows are issued straight to ISSUED with both role statements
// signed under the acting HR member, so the batch skips the manager step by design.
export const BULK_ISSUANCE_STEPS: ExplainerStep[] = [
  {
    title: 'Each row becomes a document',
    body: 'Rows are validated against the document type’s schema. A holder who already has an account is matched by email.',
  },
  {
    title: 'Hashed and signed like any other',
    body: 'Same pipeline: canonical JSON, a fresh salt, SHA-256. MANAGER and HR statements are both signed with the organisation key, and both name you, the acting HR member, so the record says the batch had one approver.',
  },
  {
    title: 'Issued directly, then anchored',
    body: 'Documents go straight to Issued, sealed at rest, and join the next Merkle batch with everything else.',
  },
]
