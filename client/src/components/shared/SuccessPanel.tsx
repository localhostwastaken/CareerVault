import type { ReactNode } from 'react'
import { BadgeCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Heading, type HeadingLevel } from '@/components/shared/Heading'
import { cn } from '@/lib/utils'

export interface SummaryRow {
  label: string
  value: ReactNode
}

interface SuccessPanelProps {
  title: string
  description?: string
  /** Facts worth confirming back to the user — what was issued, to whom, when. */
  summary?: SummaryRow[]
  /** A copyable artifact produced by the action, e.g. a share URL. */
  artifact?: ReactNode
  /** Where to go next. Lead with the action most users want. */
  actions?: ReactNode
  /** 1 when the panel replaces the page (no PageHeader above it), otherwise 2. */
  headingLevel?: HeadingLevel
  className?: string
}

// Act III. Every mutation in this app used to end at a toast that vanished in four
// seconds, leaving the user on the same screen wondering whether it worked. This is
// the durable confirmation: what happened, the proof of it, and the next step.
export function SuccessPanel({
  title,
  description,
  summary,
  artifact,
  actions,
  headingLevel = 2,
  className,
}: SuccessPanelProps) {
  return (
    <Card
      // Announced politely rather than assertively — the user just acted, so they
      // are already focused here; an assertive alert would interrupt the reading.
      role="status"
      aria-live="polite"
      className={cn('border-verified/30 bg-verified-soft p-6', className)}
    >
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-verified text-primary-foreground">
          <BadgeCheck className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <Heading level={headingLevel} className="font-serif text-h1 text-foreground">
            {title}
          </Heading>
          {description && <p className="mt-1 text-body text-muted-foreground">{description}</p>}

          {summary && summary.length > 0 && (
            <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-verified/20 pt-4 sm:grid-cols-2">
              {summary.map((row) => (
                <div key={row.label}>
                  <dt className="label-micro">{row.label}</dt>
                  <dd className="tnum mt-0.5 text-body text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {artifact && <div className="mt-4">{artifact}</div>}

          {actions && <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </Card>
  )
}
