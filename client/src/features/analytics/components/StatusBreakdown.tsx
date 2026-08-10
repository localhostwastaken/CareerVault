import { StatusBadge, type DocumentStatus } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'

// Pipeline order, not alphabetical — the list doubles as the document lifecycle.
const ORDER: DocumentStatus[] = ['REQUESTED', 'DRAFT', 'PENDING_HR', 'ISSUED', 'ANCHORED', 'REVOKED', 'EXPIRED']

// Bars are tinted from the same locked status tokens — never raw hex.
const BAR: Record<DocumentStatus, string> = {
  REQUESTED: 'bg-expired',
  DRAFT: 'bg-pending',
  PENDING_HR: 'bg-pending',
  ISSUED: 'bg-verified',
  ANCHORED: 'bg-anchor',
  REVOKED: 'bg-revoked',
  EXPIRED: 'bg-expired',
}

interface StatusBreakdownProps {
  byStatus: Partial<Record<DocumentStatus, number>>
  total: number
}

/**
 * One row per status instead of a donut.
 *
 * A 7-slice donut fails on two counts: the palette validator puts revoked red and
 * verified green at ΔE 4.0 under deuteranopia — indistinguishable — and slices
 * carry identity by colour alone. Separate rows never place two status colours
 * adjacent, every row carries icon + text + colour, and exact counts are readable
 * without hovering.
 */
export function StatusBreakdown({ byStatus, total }: StatusBreakdownProps) {
  const rows = ORDER.filter((status) => (byStatus[status] ?? 0) > 0)
  const max = Math.max(...rows.map((status) => byStatus[status] ?? 0), 1)

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((status) => {
        const count = byStatus[status] ?? 0
        const share = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <li key={status} className="grid grid-cols-[9.5rem_1fr_auto] items-center gap-3">
            <StatusBadge status={status} />
            {/* Scaled to the largest row so small counts stay visible. */}
            <span className="h-2 overflow-hidden rounded-full bg-surface-2">
              <span
                className={cn('block h-full rounded-full', BAR[status])}
                style={{ width: `${Math.max((count / max) * 100, 4)}%` }}
              />
            </span>
            <span className="tnum whitespace-nowrap text-label text-muted-foreground">
              <span className="font-semibold text-foreground">{count}</span> · {share}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}
