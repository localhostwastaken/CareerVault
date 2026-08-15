import { CalendarX, ShieldOff } from 'lucide-react'
import { Stepper, type Step, type TerminalState } from '@/components/shared/Stepper'
import type { DocumentStatus } from '@/features/document/types'

// REQUESTED and DRAFT are merged into one visible step — the holder has requested
// and the manager is drafting/signing. The real transition to PENDING_HR happens
// only when the manager signs.
const STEPS: Step[] = [
  { key: 'REQUESTED', label: 'Manager pending' },
  { key: 'PENDING_HR', label: 'Pending HR' },
  { key: 'ISSUED', label: 'Issued' },
  { key: 'ANCHORED', label: 'Anchored' },
]

const RANK: Record<DocumentStatus, number> = {
  REQUESTED: 0,
  DRAFT: 0,
  PENDING_HR: 1,
  ISSUED: 2,
  ANCHORED: 3,
  // Both terminal states are reached from ISSUED, so the rail completes through it.
  REVOKED: 3,
  EXPIRED: 3,
}

const TERMINAL: Partial<Record<DocumentStatus, TerminalState>> = {
  REVOKED: { label: 'Revoked', tone: 'revoked', icon: ShieldOff },
  EXPIRED: { label: 'Expired', tone: 'expired', icon: CalendarX },
}

export function StatusTimeline({ status }: { status: DocumentStatus }) {
  return <Stepper steps={STEPS} current={RANK[status]} terminal={TERMINAL[status]} />
}
