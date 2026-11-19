// The live fallback for the recorded demo (16 Nov 2026 take, demo-guide/demo-script.html):
// the same nine chapters in the same order, as data. `to` is an in-app route; a step that
// happens on PolygonScan gets its link at render time.
export interface DemoStep {
  /** The video timestamp this step matches. */
  at: string
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
    at: '00:00',
    actor: 'Anyone',
    action: 'Open the home page. Scroll once, then show the “Have a share link? Check it.” box.',
    to: '/',
    linkLabel: 'Open home page',
    happening: 'Anyone can check a document here, with no account.',
  },
  {
    at: '00:40',
    actor: 'Holder',
    account: 'imperialsample+alice@gmail.com',
    action:
      'Request a document → Experience Letter → TechCorp, any available manager, a short note, tick “Enable AI skill extraction” → Review & send → Send request.',
    to: '/app/request',
    linkLabel: 'Request a document',
    happening: 'Alice only asks. TechCorp writes the content, which is why the result can be trusted.',
  },
  {
    at: '01:24',
    actor: 'Manager',
    account: 'marcus@techcorp.example.com',
    action:
      'Inbox → Draft & sign on Alice’s request. Fill employee code TC-2041, Software Engineer, Full-time, joined 01/06/2022, and a one-line summary → Sign & send to HR. In the step-up, type one wrong answer first (city “Andheri”), then the right details.',
    to: '/app/inbox',
    linkLabel: 'Open inbox',
    happening: 'The wrong answer is refused and nothing is signed. The right details unlock Marcus’s key and he signs.',
  },
  {
    at: '02:36',
    actor: 'HR',
    account: 'hr@techcorp.example.com',
    action:
      'Approvals → Review on Alice’s letter → Approve & issue, with the same step-up details. Optional: show Supabase Storage (careervault-storage → objects → documents) and the documents table, content_json column.',
    to: '/app/approvals',
    linkLabel: 'Open approvals',
    happening: 'A second person approves and the letter is issued. The database and the stored PDF hold only ciphertext.',
  },
  {
    at: '04:00',
    actor: 'Holder',
    account: 'imperialsample+alice@gmail.com',
    action:
      'Documents → the Experience Letter → Download PDF. Then Share → create the link → Preview what they’ll see.',
    to: '/app/documents',
    linkLabel: 'Open documents',
    happening: 'Verified, 5 / 5, in seconds, with no account. The on-chain badge says “pending” until the next batch.',
  },
  {
    at: '05:42',
    actor: 'Org admin',
    account: 'admin@techcorp.example.com',
    action:
      'Analytics → Blockchain anchoring → Anchor now → Open the transaction on PolygonScan. Back on the letter’s page, click “Copy Merkle root as bytes32”.',
    to: '/app/analytics',
    linkLabel: 'Open analytics',
    happening: 'The issued letters become one root on Polygon Amoy, in one transaction. Verifying again now shows “Timestamped on-chain”.',
  },
  {
    at: '06:36',
    actor: 'Anyone',
    action: 'PolygonScan → Read Contract → 8. verifyRoot → paste the root → Query.',
    external: 'readContract',
    linkLabel: 'Open Read Contract',
    happening: 'The chain itself answers exists: true, with the document count and the anchoring wallet.',
  },
  {
    at: '07:12',
    actor: 'HR',
    account: 'hr@techcorp.example.com',
    action:
      'Issued → “Experience Letter — For Bob Holder” → Revoke → pick a reason, add a note → Revoke. Then open its public verification.',
    to: '/app/issued',
    linkLabel: 'Open issued',
    happening: 'Anyone who checks it now sees Revoked (4 / 5) with the date and reason.',
  },
  {
    at: '07:48',
    actor: 'Anyone',
    action: 'PolygonScan → Events: DocumentRevoked on top, the anchor below it.',
    external: 'events',
    linkLabel: 'Open Events',
    happening: 'The revocation is on public record too.',
  },
  {
    at: '08:12',
    actor: 'Org admin',
    account: 'admin@techcorp.example.com',
    action: 'Organisation → Members → Audit log.',
    to: '/app/audit',
    linkLabel: 'Open audit log',
    happening: 'Every request, signature, issue, check and revoke is logged, with who and when.',
  },
  {
    at: '08:36',
    actor: 'Recruiter',
    account: 'recruiter@techcorp.example.com',
    action: 'Talent search → “Backend Engineer — Payments” → Find candidates. Then, as Alice, open Talent Profile.',
    to: '/app/talent',
    linkLabel: 'Open talent search',
    happening: 'Alice comes up as a match with a plain reason, from her verified, consented letters only.',
  },
]
