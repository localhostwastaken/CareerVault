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
    action: 'Open the request in the inbox, fill in the facts, and sign.',
    to: '/app/inbox',
    linkLabel: 'Open the inbox',
    happening:
      'The content is canonicalised (JCS), salted and hashed with SHA-256. The org key signs a MANAGER statement over that hash. The content, salt and signature are sealed with AES-256-GCM before they reach the database.',
  },
  {
    actor: 'HR',
    account: 'hr@techcorp.example.com',
    action: 'Open Approvals, review, and Approve & issue.',
    to: '/app/approvals',
    linkLabel: 'Open approvals',
    happening:
      'HR signs a second, distinct statement (role HR, own membership). The PDF is rendered and encrypted before it is stored. The document is now Issued.',
  },
  {
    actor: 'Anyone',
    action: 'On the document page, click “Run public verification”.',
    happening:
      'The verdict is “Verified — anchoring pending”: the hash and both signatures recompute, and the on-chain anchor is still queued.',
  },
  {
    actor: 'Org admin',
    account: 'admin@techcorp.example.com',
    action: 'Analytics → Blockchain anchoring → Anchor now, then open the transaction.',
    to: '/app/analytics',
    linkLabel: 'Open analytics',
    happening:
      'The integrity gate re-decrypts and re-hashes each issued document. The hashes become a Merkle tree, and the anchor wallet sends anchorRoot(root, count) to the registry on Polygon Amoy. PolygonScan shows Success and a RootAnchored event.',
  },
  {
    actor: 'Anyone',
    action: 'On PolygonScan, call verifyRoot with the root copied from the batch row.',
    external: 'readContract',
    linkLabel: 'Open Read Contract',
    happening: 'The answer, exists = true with the block time, comes straight from the chain, not from CareerVault.',
  },
  {
    actor: 'Anyone',
    action: 'Refresh the public verification.',
    happening:
      'The verdict is now “Verified”. The Merkle proof folds to the root, verifyRoot confirms it, and the anchor card links the transaction and the contract.',
  },
  {
    actor: 'Holder',
    account: 'alice@holder.example.com',
    action: 'Open the document and click “Download proof file”.',
    to: '/app/documents',
    linkLabel: 'Open documents',
    happening:
      'The holder now has a file containing the content, salt, both signatures, the issuer key and the Merkle proof. It can be verified without CareerVault.',
  },
  {
    actor: 'Anyone',
    action: 'Drop the file into the proof-file checker, then edit one character of its content and run again.',
    to: '/verify/file',
    linkLabel: 'Open the file checker',
    happening:
      'Every check runs in the browser against public Polygon RPCs. The edit breaks Integrity at once: tamper-evidence you can see.',
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
    action: 'Show the contract’s event log: every anchor and revocation the registry has recorded.',
    external: 'events',
    linkLabel: 'Open contract events',
    happening: 'Anyone can audit the registry. CareerVault’s wallet is the only one authorised to write to it.',
  },
]
