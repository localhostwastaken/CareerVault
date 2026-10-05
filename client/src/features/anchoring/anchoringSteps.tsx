import type { ExplainerStep } from '@/components/shared/Explainer'
import { Term } from '@/components/shared/Explainer'

// What one anchoring batch does, in the order merkle.service.ts does it. Shared by the
// admin's "Anchor now" card and every anchor panel, so the story is told the same way.
export const ANCHORING_STEPS: ExplainerStep[] = [
  {
    title: 'Collect',
    body: 'Every issued document in this organisation that is not in a batch yet becomes a candidate.',
  },
  {
    title: 'Integrity gate',
    body: (
      <>
        Each candidate&rsquo;s encrypted content and salt are decrypted and its hash recomputed:{' '}
        <Term>SHA-256(JCS(content) + salt)</Term> must equal the stored document hash. A row edited directly in the
        database fails here and is left un-anchored.
      </>
    ),
  },
  {
    title: 'Merkle tree',
    body: 'The document hashes are the leaves. Pairs are sorted and hashed with SHA-256 up to a single 32-byte root. Each document keeps its proof path: the sibling hashes that lead from it to the root.',
  },
  {
    title: 'Write to Polygon',
    body: (
      <>
        CareerVault&rsquo;s anchor wallet calls <Term>anchorRoot(root, count)</Term> on the AnchorRegistry contract and
        waits for confirmations. Only the 32-byte root goes on-chain: no names, no content.
      </>
    ),
  },
  {
    title: 'Anchored',
    body: (
      <>
        The documents move to Anchored. From now on, public verification folds each proof to the root and asks the
        contract <Term>verifyRoot(root)</Term>, and each proof file carries its Merkle path.
      </>
    ),
  },
]
