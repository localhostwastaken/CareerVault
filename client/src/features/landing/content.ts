import { Anchor, Building2, FileSignature, Search, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react'

export interface Pillar {
  icon: LucideIcon
  title: string
  body: string
}

// Credibility comes from describing what the system actually does — no invented
// customer counts or logos.
export const PILLARS: Pillar[] = [
  {
    icon: FileSignature,
    title: 'Dual-signed at the source',
    body: 'Every document is signed by the employee’s manager and co-signed by HR before it is issued. Neither can issue alone.',
  },
  {
    icon: Anchor,
    title: 'Anchored to a public ledger',
    body: 'Documents are hashed with SHA-256 and their daily Merkle root is committed on-chain, creating tamper-evident proof of existence.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified in seconds, by anyone',
    body: 'A six-step cryptographic check runs from a single share link. No account, no phone call to HR, no waiting.',
  },
]

// Illustrative, and labelled as such wherever it renders: one record told end to end.
// The hero's verification sample shows this same document hash.
export const EXAMPLE_HASH = '8f2c9a1e4b6d0357af92c1e8d4b6a70f3c5e9b1d2a4f6c8e0b3d5f7a9c1e3b5d'

export interface RecordEvent {
  step: string
  role: string
  actor: string
  action: string
  detail: string
  /** ISO timestamp, rendered in the viewer's timezone. */
  at: string
  evidence: { label: string; value: string; isMono?: boolean; tone?: 'anchor' | 'verified' }
}

export const EXAMPLE_RECORD = {
  type: 'Experience Letter',
  holder: 'Priya Sharma',
  issuer: 'TechCorp',
  reference: 'TECHCO/EXP/2026/K7M2P9',
  events: [
    {
      step: '01',
      role: 'Employee',
      actor: 'Priya Sharma',
      action: 'Requested the letter',
      detail: 'Chose TechCorp, a verified organisation, and the manager who knows her work.',
      at: '2026-06-12T03:44:00Z',
      evidence: { label: 'Routed to', value: 'Rohan Mehta, Manager' },
    },
    {
      step: '02',
      role: 'Manager',
      actor: 'Rohan Mehta',
      action: 'Drafted and signed',
      detail: 'Signed a MANAGER statement over the content hash with TechCorp’s key.',
      at: '2026-06-12T05:32:00Z',
      evidence: { label: 'Reference', value: 'TECHCO/EXP/2026/K7M2P9', isMono: true },
    },
    {
      step: '03',
      role: 'HR',
      actor: 'Ananya Iyer',
      action: 'Co-signed and issued',
      detail: 'Added the HR statement. A document is issued only once both signatures exist.',
      at: '2026-06-12T10:10:00Z',
      evidence: { label: 'Document hash', value: `${EXAMPLE_HASH.slice(0, 10)}…${EXAMPLE_HASH.slice(-6)}`, isMono: true },
    },
    {
      step: '04',
      role: 'Merkle batch',
      actor: 'CareerVault',
      action: 'Anchored on Polygon',
      detail: 'That day’s documents were batched into one Merkle root and committed on-chain.',
      at: '2026-06-12T18:30:00Z',
      evidence: { label: 'Block', value: '#84219301', isMono: true, tone: 'anchor' },
    },
    {
      step: '05',
      role: 'Verifier',
      actor: 'A recruiter',
      action: 'Verified from a share link',
      detail: 'Every check recomputed from the record — no account, no call to HR.',
      at: '2026-06-18T04:57:00Z',
      evidence: { label: 'Result', value: '6 of 6 checks passed', tone: 'verified' },
    },
  ] satisfies RecordEvent[],
}

export interface AudiencePath {
  icon: LucideIcon
  audience: string
  headline: string
  body: string
  cta: string
  to: string
}

// "I am a…" path selection — the Enterprise Gateway pattern, mapped to our personas.
export const PATHS: AudiencePath[] = [
  {
    icon: UserRound,
    audience: 'I’m an employee',
    headline: 'Own your record',
    body: 'Collect experience letters, salary proofs and recommendations in a wallet that outlives any employer.',
    cta: 'Create your wallet',
    to: '/auth/register',
  },
  {
    icon: Building2,
    audience: 'I’m an employer',
    headline: 'Issue once, prove forever',
    body: 'Cut verification calls to zero. Issue in bulk from a CSV, revoke instantly, and keep a compliance-grade audit trail.',
    cta: 'Set up your organisation',
    to: '/auth/register',
  },
  {
    icon: Search,
    audience: 'I’m verifying someone',
    headline: 'Trust, then hire',
    body: 'Check a candidate’s document against its signatures and on-chain anchor. Free, instant, no account required.',
    cta: 'Verify a document',
    to: '/verify',
  },
]
