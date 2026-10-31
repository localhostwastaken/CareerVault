// The live demo's click path (documentation/cryptography.md §9.2), as data: who acts,
// where to click, and what the system is doing underneath. `to` is an in-app route; a
// step that happens outside the portal (PolygonScan) gets its link at render time.
export interface DemoStep {
  actor: string
  account?: string
  action: string
  to?: string
  linkLabel?: string
  /** "chain" steps link to the live registry, resolved from /health/status. */
  external?: 'readContract' | 'events'
  happening: string
}

export const DEMO_STEPS: DemoStep[] = [
  {
    actor: 'Manager',
    account: 'marcus@techcorp.example.com',
    action: 'Profile → Signing security. Show the enrolled key (or enrol: date of birth, ID, three answers).',
    to: '/app/profile',
    linkLabel: 'Open profile',
    happening:
      'The answers are normalised and stretched with PBKDF2-SHA256 (600,000 rounds, random salt) into a 256-bit key. Only an AES-256-GCM-encrypted copy is stored; the answers themselves never are.',
  },
  {
    actor: 'Holder',
    account: 'alice@holder.example.com',
    action: 'Request an experience letter from TechCorp.',
    to: '/app/request',
    linkLabel: 'Request a document',
    happening:
      'Only a request is stored. The organisation, not the holder, writes the content, which is why the result can be trusted.',
  },
  {
    actor: 'Manager',
    account: 'marcus@techcorp.example.com',
    action: 'Open the request, fill in the facts, re-enter the signing details, and sign. Try one wrong answer first.',
    to: '/app/inbox',
    linkLabel: 'Open the inbox',
    happening:
      'A wrong answer is refused and counted (five lock signing for 15 minutes). The right ones unlock the key: the content becomes fixed-layout bytes plus a salt, SHA-256 gives the hash, HMAC-SHA256 with the manager’s key gives the seal, and the org’s RSA-2048 key signs both. Everything is AES-256-GCM-encrypted before it reaches the database.',
  },
  {
    actor: 'HR',
    account: 'hr@techcorp.example.com',
    action: 'Open Approvals, review, re-enter HR’s signing details, and Approve & issue.',
    to: '/app/approvals',
    linkLabel: 'Open approvals',
    happening:
      'HR first confirms the bytes still hash to what the manager signed, then adds a seal with HR’s own key and a separate HR signature. The PDF is rendered and encrypted. The document is now Issued.',
  },
  {
    actor: 'Anyone',
    action: 'On the document page, click “Open public verification”.',
    happening:
      'Only the document ID goes to the server, which decrypts the record and recomputes the hash, both seals and both signatures. The verdict is “Verified” at once; the on-chain badge says pending, and that never matters to validity.',
  },
  {
    actor: 'Org admin',
    account: 'admin@techcorp.example.com',
    action: 'Analytics → Blockchain anchoring → Anchor now, then open the transaction.',
    to: '/app/analytics',
    linkLabel: 'Open analytics',
    happening:
      'The integrity gate re-decrypts and re-hashes each issued document. The hashes become a Merkle tree, and the anchor wallet sends anchorRoot(root, count) to the registry on Polygon Amoy.',
  },
  {
    actor: 'Anyone',
    action: 'Refresh the public verification.',
    happening:
      'Same verdict; the badge now reads “Timestamped on-chain” and links the transaction. The chain is a public receipt, never a condition.',
  },
  {
    actor: 'Anyone',
    action: 'On PolygonScan, call verifyRoot with the root copied from the batch row.',
    external: 'readContract',
    linkLabel: 'Open Read Contract',
    happening: 'The answer, exists = true with the block time, comes straight from the chain, not from CareerVault.',
  },
  {
    actor: 'HR',
    account: 'hr@techcorp.example.com',
    action: 'Issued → open a document → Revoke. Verify it again.',
    to: '/app/issued',
    linkLabel: 'Open issued',
    happening:
      'The register now says Revoked, and it has the final say. A DocumentRevoked event follows on the contract’s Events tab.',
  },
  {
    actor: 'Anyone',
    action: 'Open the SHA-256 lab and hash “abc”.',
    to: '/demo/sha256',
    linkLabel: 'Open the lab',
    happening:
      'Our own SHA-256, bit by bit: padding to 512 bits, the 64-word schedule, all 64 rounds, and the digest, checked live against the browser’s built-in SHA-256.',
  },
]
