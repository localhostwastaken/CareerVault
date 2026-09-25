import type { Step, TerminalState } from '@/components/shared/Stepper'
import { CalendarX, ShieldOff } from 'lucide-react'
import type { DocumentDetail, DocumentStatus } from '@/features/document/types'
import { formatRelativeTime } from '@/lib/format'

/**
 * The rail shows MILESTONES THAT HAVE HAPPENED, not "which step are we on".
 *
 * The old model marked the current status as in-progress, so a document whose status
 * was literally ISSUED rendered "Issued" as an unfinished step — the thing had
 * demonstrably happened. Counting completed milestones instead means the tick always
 * agrees with the status badge.
 */
export const MILESTONES: Step[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'signed', label: 'Manager signed' },
  { key: 'issued', label: 'HR issued' },
  { key: 'anchored', label: 'Anchored on-chain' },
]

// How many milestones are DONE for a given status.
const COMPLETED: Record<DocumentStatus, number> = {
  REQUESTED: 1,
  DRAFT: 1,
  PENDING_HR: 2,
  ISSUED: 3,
  ANCHORED: 4,
  // Terminal states are reached from ISSUED, so everything up to issuance happened.
  REVOKED: 3,
  EXPIRED: 3,
}

const TERMINAL: Partial<Record<DocumentStatus, TerminalState>> = {
  REVOKED: { label: 'Revoked', tone: 'revoked', icon: ShieldOff },
  EXPIRED: { label: 'Expired', tone: 'expired', icon: CalendarX },
}

export interface ProgressSummary {
  completed: number
  terminal?: TerminalState
  /** One plain sentence: what is happening right now. */
  headline: string
  /** Optional second line: what happens next, or what the holder can do. */
  detail?: string
  /** Few words for a list row, where the full sentence will not fit. */
  short: string
  tone: 'pending' | 'verified' | 'revoked' | 'neutral'
}

/** A manager sent it back to the holder: still DRAFT in the database, shown as "Returned". */
export function isReturned(document: DocumentDetail): boolean {
  return (document.contentJson as Record<string, unknown> | null)?.returnedByManager === true
}

/**
 * Plain-language status. A holder should never have to infer from a badge who is
 * sitting on their request or how long it has been there.
 */
export function documentProgress(document: DocumentDetail): ProgressSummary {
  const completed = COMPLETED[document.status]
  const terminal = TERMINAL[document.status]
  const waitingSince = formatRelativeTime(document.updatedAt)
  const manager = document.assignedManagerName

  switch (document.status) {
    case 'REQUESTED':
    case 'DRAFT':
      return {
        completed,
        headline: manager
          ? `Waiting for ${manager} to draft and sign this document.`
          : `Waiting for ${document.organizationName} to assign a manager.`,
        detail: `Requested ${formatRelativeTime(document.createdAt)}. Once signed, it goes to HR for a second signature.`,
        short: manager ? `With ${manager}` : 'Awaiting assignment',
        tone: 'pending',
      }
    case 'PENDING_HR':
      return {
        completed,
        headline: `Signed by ${manager ?? 'the manager'} — now waiting on HR at ${document.organizationName}.`,
        detail: `With HR since ${waitingSince}. HR co-signs and issues the final document.`,
        short: 'With HR',
        tone: 'pending',
      }
    case 'ISSUED':
      return {
        completed,
        headline: 'Issued and dual-signed. You can share and download it now.',
        detail:
          'The on-chain anchor is added in the next nightly batch. Your document is already valid and verifiable without it.',
        short: 'Ready to share',
        tone: 'verified',
      }
    case 'ANCHORED':
      return {
        completed,
        headline: 'Issued and anchored on-chain. Fully verifiable.',
        detail: 'Anyone can confirm this document against the public ledger.',
        short: 'Anchored on-chain',
        tone: 'verified',
      }
    case 'REVOKED':
      return {
        completed,
        terminal,
        headline: `${document.organizationName} revoked this document.`,
        detail: 'Anyone verifying it will be told it is revoked. It can no longer be relied on.',
        short: 'Revoked',
        tone: 'revoked',
      }
    case 'EXPIRED':
      return {
        completed,
        terminal,
        headline: 'This document has passed its validity period.',
        detail: 'It was genuine when issued. Request a fresh one if you need current proof.',
        short: 'Expired',
        tone: 'neutral',
      }
  }
}
