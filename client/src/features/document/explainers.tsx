import type { ExplainerStep } from '@/components/shared/Explainer'
import { Term } from '@/components/shared/Explainer'

// "What's happening here" copy for each step of the document lifecycle, in the order the
// server does the work (document.service.ts, crypto.util.ts, R10 field encryption). Kept
// beside the feature so the copy changes with the code it describes.

export const REQUEST_STEPS: ExplainerStep[] = [
  {
    title: 'Your request is routed',
    body: 'It goes to the manager you pick, or to one the organisation assigns, and appears in their inbox. Nothing is signed yet: a request only names the document you need.',
  },
  {
    title: 'The manager writes and signs it',
    body: 'They fill in the facts (role, dates, salary) and sign. The organisation authors the content. You can’t edit it, which is what makes it worth trusting.',
  },
  {
    title: 'HR co-signs and issues it',
    body: 'A second person adds a separate signature. Only then is the document issued to your wallet. You get a notification at each step.',
  },
  {
    title: 'It becomes provable',
    body: 'Once issued you can download it, share a verification link, and later see it anchored on Polygon.',
  },
]

export const SIGNING_STEPS: ExplainerStep[] = [
  {
    title: 'Validate and normalise',
    body: 'The server checks the fields against this document type’s schema, drops empty optional fields, and adds the schema version, issue date and reference number.',
  },
  {
    title: 'Canonicalise',
    body: (
      <>
        The content is serialised with <Term>JCS (RFC 8785)</Term>: sorted keys and fixed number formats, so the same
        facts always produce the same bytes.
      </>
    ),
  },
  {
    title: 'Salt and hash',
    body: (
      <>
        A fresh 32-byte random salt is appended and hashed: <Term>SHA-256(JCS(content) + salt)</Term>. The salt makes
        the hash impossible to guess. Deleting it later cuts the link to the person (GDPR erasure).
      </>
    ),
  },
  {
    title: 'Sign a MANAGER statement',
    body: (
      <>
        The organisation key signs <Term>SHA-256(JCS({'{'}v:1, documentHash, role: MANAGER, memberId{'}'}))</Term>{' '}
        with RS256. The statement names your role and membership, so it records who attested.
      </>
    ),
  },
  {
    title: 'Seal before storing',
    body: (
      <>
        The content, salt and signature are written as AES-256-GCM envelopes (<Term>cvenc:v1:…</Term>), so the
        database never holds them in plaintext. The document then moves to HR.
      </>
    ),
  },
]

export const APPROVAL_STEPS: ExplainerStep[] = [
  {
    title: 'A second, distinct signature',
    body: (
      <>
        HR signs a statement over the same hash with <Term>role: HR</Term> and their own membership. The manager who
        signed can’t approve, so issuing takes two people.
      </>
    ),
  },
  {
    title: 'Issue and render',
    body: 'The status becomes Issued. A PDF is rendered with the document hash in its footer and encrypted before it reaches storage.',
  },
  {
    title: 'Verifiable immediately',
    body: 'Public verification passes at once as “Verified — anchoring pending”. Both signatures and the hash already check out.',
  },
  {
    title: 'Anchored in the next batch',
    body: 'The nightly batch (or an admin’s “Anchor now”) adds it to a Merkle tree whose root is written to Polygon.',
  },
]

export const PROOF_FILE_STEPS: ExplainerStep[] = [
  {
    title: 'What the file contains',
    body: 'The signed content, its salt, both signatures, the issuer’s public key and, once anchored, the Merkle proof and the anchoring transaction.',
  },
  {
    title: 'Recompute the hash',
    body: (
      <>
        <Term>SHA-256(JCS(credentialSubject) + salt)</Term> must equal the document hash in the file. Edit one
        character of the content and this fails.
      </>
    ),
  },
  {
    title: 'Check both signatures',
    body: 'Each role statement is rebuilt and its RS256 signature checked against the embedded public key.',
  },
  {
    title: 'Fold the Merkle proof and ask the chain',
    body: 'The proof path must fold to the anchored root, and the pinned AnchorRegistry on Polygon must say that root exists. CareerVault isn’t involved in any of this.',
  },
]

export const REVOCATION_STEPS: ExplainerStep[] = [
  {
    title: 'The register is updated',
    body: 'The status becomes Revoked immediately. The register has the final say, so every verification from now on reports it as revoked, whatever the chain says.',
  },
  {
    title: 'The proof file says so too',
    body: 'Downloaded credentials carry a revocation block from now on, and the offline verifier fails them.',
  },
  {
    title: 'Flagged on-chain',
    body: (
      <>
        The server also calls <Term>revokeDocument(hash)</Term> on the registry in the background, which emits a{' '}
        <Term>DocumentRevoked</Term> event that anyone can see on PolygonScan. Revocation can’t be undone.
      </>
    ),
  },
]

export const ERASURE_STEPS: ExplainerStep[] = [
  {
    title: 'Your identity is scrubbed',
    body: 'Your name and email are anonymised. Sessions, notifications, talent matches, messages, share links and verifier API keys are removed in the same transaction.',
  },
  {
    title: 'Every document loses its content and salt',
    body: 'Issued, anchored and revoked documents alike: the content, every version snapshot and the stored PDFs are deleted.',
  },
  {
    title: 'The hash becomes a dead hash',
    body: 'The issuer keeps a bare record that a document existed. Without the content and the salt, nobody can recompute the hash or link it back to you. Public verification only says the holder exercised erasure.',
  },
  {
    title: 'The chain needs no change',
    body: 'Polygon only ever held a Merkle root, never anything about you, so nothing on-chain has to be deleted. This is why the hash is salted.',
  },
]
