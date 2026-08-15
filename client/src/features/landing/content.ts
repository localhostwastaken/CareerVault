import {
  Anchor,
  BadgeCheck,
  Building2,
  FileSignature,
  PenLine,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

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

export interface Stage {
  icon: LucideIcon
  label: string
  actor: string
  body: string
}

export const STAGES: Stage[] = [
  { icon: Send, label: 'Request', actor: 'Employee', body: 'Pick a verified organisation and the document you need.' },
  { icon: PenLine, label: 'Sign', actor: 'Manager', body: 'The assigned manager drafts the details and signs.' },
  { icon: BadgeCheck, label: 'Co-sign', actor: 'HR', body: 'HR reviews, co-signs, and issues the final document.' },
  { icon: Anchor, label: 'Anchor', actor: 'CareerVault', body: 'The hash joins that day’s Merkle root, committed on-chain.' },
  { icon: Search, label: 'Verify', actor: 'Anyone', body: 'A share link runs every authenticity check, publicly.' },
]

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
