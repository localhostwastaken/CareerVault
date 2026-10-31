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
    title: 'Unlock your own key',
    body: (
      <>
        You re-enter your date of birth, ID and three answers. The server stretches them with{' '}
        <Term>PBKDF2-SHA256 (600,000 rounds)</Term> and compares the result, in constant time, with your key, which is
        only ever stored encrypted with <Term>AES-256-GCM</Term>. A stolen login alone cannot sign.
      </>
    ),
  },
  {
    title: 'Write the exact bytes',
    body: 'The fields go into a fixed binary layout (type, length, value, keys in byte order) together with the document ID, type, organisation and holder, followed by a fresh 32-byte random salt.',
  },
  {
    title: 'Hash and seal',
    body: (
      <>
        <Term>SHA-256(bytes)</Term> is the document hash. <Term>HMAC-SHA256(your key, bytes)</Term> is your seal: only
        your key can produce it, and one changed character breaks it.
      </>
    ),
  },
  {
    title: 'Sign',
    body: (
      <>
        The organisation&rsquo;s <Term>RSA-2048</Term> key signs a statement that binds the hash to your seal, your
        role and your key, so it records exactly who attested.
      </>
    ),
  },
  {
    title: 'Encrypt before storing',
    body: (
      <>
        The content, salt, seal and signature are written as AES-256-GCM envelopes (<Term>cvenc:v1:…</Term>), so the
        database never holds them in plaintext. The document then moves to HR.
      </>
    ),
  },
]

export const APPROVAL_STEPS: ExplainerStep[] = [
  {
    title: 'A second person, a second key',
    body: (
      <>
        HR first confirms the stored bytes still hash to what the manager signed, then unlocks their own key with their
        own answers and adds a separate seal and a <Term>role: HR</Term> signature. The manager who signed can’t
        approve, so issuing takes two people.
      </>
    ),
  },
  {
    title: 'Issue and render',
    body: 'The status becomes Issued. A PDF is rendered with the document ID and its verification link in the footer, and encrypted before it reaches storage.',
  },
  {
    title: 'Verifiable immediately',
    body: 'Public verification passes at once. The on-chain timestamp shows as pending until the next batch; it never affects the verdict.',
  },
  {
    title: 'Timestamped in the next batch',
    body: 'The nightly batch (or an admin’s “Anchor now”) adds it to a Merkle tree whose root is written to Polygon, as a public secondary receipt.',
  },
]

export const REVOCATION_STEPS: ExplainerStep[] = [
  {
    title: 'The register is updated',
    body: 'The status becomes Revoked immediately. The register has the final say, so every verification from now on reports it as revoked, whatever the chain says.',
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
