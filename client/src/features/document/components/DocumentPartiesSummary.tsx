import { Building2, CalendarClock, MessageSquareText, PenLine, Stamp, User, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import type { DocumentDetail } from '@/features/document/types'
import { useDocumentFraming } from '@/features/document/useDocumentFraming'

const PRE_ISSUE = ['REQUESTED', 'DRAFT', 'PENDING_HR']

interface RowDef {
  icon: LucideIcon
  label: string
  value: string
  valueMuted?: boolean
  status?: string
  statusDone?: boolean
}

// The role-aware "who's who" header. Answers, for every viewer at a glance: who is
// this document about (holder), who issues it (org), who signs/approves it, and why.
export function DocumentPartiesSummary({ document }: { document: DocumentDetail }) {
  const framing = useDocumentFraming(document)
  const content = document.contentJson as Record<string, unknown>
  const returned = content.returnedByManager === true
  const note =
    typeof content.note === 'string' ? content.note : typeof content.requestNote === 'string' ? content.requestNote : null
  const preIssue = PRE_ISSUE.includes(document.status)

  const holderRow: RowDef = {
    icon: User,
    label: framing.emphasize === 'holder' ? 'For' : 'Holder',
    value: document.holderName,
    status: framing.showHolderEmail ? document.holderEmail : undefined,
  }
  const issuerRow: RowDef = {
    icon: Building2,
    label: framing.emphasize === 'issuer' ? (preIssue ? 'Requested from' : 'Issued by') : 'Issuer',
    value: document.organizationName,
  }
  const managerRow: RowDef = {
    icon: PenLine,
    label: 'Manager (signer)',
    value: document.signerName ?? 'Auto-assigned at request',
    valueMuted: !document.signerName,
    status: document.hasManagerSignature ? 'Signed' : 'Awaiting signature',
    statusDone: document.hasManagerSignature,
  }
  const hrRow: RowDef = {
    icon: Stamp,
    label: 'HR (approver)',
    value: document.approverName ?? '—',
    valueMuted: !document.approverName,
    status: document.hasHrSignature ? 'Approved & issued' : 'Awaiting approval',
    statusDone: document.hasHrSignature,
  }
  const requestedRow: RowDef = { icon: CalendarClock, label: 'Requested', value: formatDate(document.createdAt) }

  // Recruiters/anonymous viewers see a neutral summary (no internal signer identities);
  // the holder and org actors see the full signing chain. Lead with the party that matters.
  const showActors = framing.isHolder || framing.isIssuerActor
  const lead = framing.emphasize === 'holder' ? [holderRow, issuerRow] : [issuerRow, holderRow]
  const rows = [...lead, ...(showActors ? [managerRow, hrRow] : []), requestedRow]

  return (
    <Card className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <PartyRow key={row.label} {...row} />
        ))}
      </div>
      {note && (
        <div className="border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-subtle">
            <MessageSquareText className="size-3.5" />
            {returned ? 'Return reason' : 'Purpose'}
          </p>
          <p className="mt-1 text-sm text-foreground">{note}</p>
        </div>
      )}
    </Card>
  )
}

function PartyRow({ icon: Icon, label, value, valueMuted, status, statusDone }: RowDef) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">{label}</p>
        <p className={cn('truncate text-sm', valueMuted ? 'text-muted-foreground' : 'font-medium text-foreground')}>
          {value}
        </p>
        {status && <p className={cn('truncate text-xs', statusDone ? 'text-verified' : 'text-subtle')}>{status}</p>}
      </div>
    </div>
  )
}
