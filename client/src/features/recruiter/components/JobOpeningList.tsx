import type { JobOpening } from '@/features/recruiter/types'
import { cn } from '@/lib/utils'

interface JobOpeningListProps {
  openings: JobOpening[]
  selectedId: string | null
  onSelect: (id: string) => void
}

// A vertical picker on desktop; on narrow screens it becomes a horizontal strip so
// the candidate results stay above the fold.
export function JobOpeningList({ openings, selectedId, onSelect }: JobOpeningListProps) {
  return (
    // A pressed-button group, not role="tab": the results render in a sibling column
    // that is no tabpanel, and there is no arrow-key handling to honour the tabs contract.
    <div
      role="group"
      aria-label="Job openings"
      className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
    >
      {openings.map((opening) => {
        const isActive = opening.id === selectedId
        return (
          <button
            key={opening.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(opening.id)}
            className={cn(
              'focus-ring w-56 shrink-0 cursor-pointer rounded-lg border p-3 text-left transition-colors lg:w-auto',
              isActive
                ? 'border-primary bg-accent'
                : 'border-border bg-card hover:border-rule-strong hover:bg-surface-2',
            )}
          >
            <p className="truncate text-label font-semibold text-foreground">{opening.title}</p>
            <p className="tnum mt-0.5 text-label text-muted-foreground">
              {opening.matchCount} match{opening.matchCount === 1 ? '' : 'es'}
              {opening.closedAt ? ' · closed' : ''}
            </p>
          </button>
        )
      })}
    </div>
  )
}
