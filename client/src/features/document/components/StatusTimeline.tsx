import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentStatus } from '@/features/document/types'

const STEPS: Array<{ key: string; label: string }> = [
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'PENDING_HR', label: 'Pending HR' },
  { key: 'ISSUED', label: 'Issued' },
  { key: 'ANCHORED', label: 'Anchored' },
]

// Maps a persisted status to the furthest timeline step it has reached (R1 lifecycle).
const RANK: Record<DocumentStatus, number> = {
  REQUESTED: 0,
  DRAFT: 0,
  PENDING_HR: 1,
  ISSUED: 2,
  ANCHORED: 3,
  REVOKED: 2,
  EXPIRED: 2,
}

export function StatusTimeline({ status }: { status: DocumentStatus }) {
  const current = RANK[status]
  const terminal = status === 'REVOKED' || status === 'EXPIRED'

  return (
    <ol className="flex items-center">
      {STEPS.map((step, index) => {
        const reached = index < current
        const active = index === current && !terminal
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full text-xs font-semibold',
                  reached
                    ? 'bg-verified text-primary-foreground'
                    : active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-2 text-subtle',
                )}
              >
                {reached ? <Check className="size-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-xs',
                  reached || active ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <span className={cn('mx-2 h-px flex-1', index < current ? 'bg-verified' : 'bg-border')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
