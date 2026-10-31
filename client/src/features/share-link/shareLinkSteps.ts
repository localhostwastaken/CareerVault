import type { ExplainerStep } from '@/components/shared/Explainer'

// What a share link discloses and how it differs from a bare hash lookup
// (verification.service.ts: token lookups return full content; hash lookups an allow-list).
export const SHARE_LINK_STEPS: ExplainerStep[] = [
  {
    title: 'A link is consent to disclose',
    body: 'Whoever opens the link sees this one document in full, including fields a public document-ID lookup withholds, such as salary figures and PAN/UAN.',
  },
  {
    title: 'The same five checks run on every view',
    body: 'Opening the link re-runs the full verification on our server: content integrity, both signatures and revocation, with the on-chain timestamp shown alongside. The viewer needs no account.',
  },
  {
    title: 'You stay in control',
    body: 'Each view is counted. A link can expire, stop after a set number of views, or be deactivated here at any time. Every view is written to the audit log.',
  },
]
