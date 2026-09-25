import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EvidenceFact {
  label: string
  value: ReactNode
  /** Status meaning only — pair with an icon so colour is never the sole signal. */
  tone?: 'verified' | 'pending' | 'revoked' | 'anchor'
  icon?: LucideIcon
}

const TONE = {
  verified: 'text-verified',
  pending: 'text-pending',
  revoked: 'text-revoked',
  anchor: 'text-anchor',
} as const

interface EvidenceStripProps {
  facts: EvidenceFact[]
  /** Names the strip for assistive tech, e.g. "Match evidence". */
  label: string
  className?: string
}

// A record excerpt, not a stat card: labelled facts in one quiet ruled line, read
// left to right. Wraps rather than truncates, because a clipped fact is a wrong fact.
export function EvidenceStrip({ facts, label, className }: EvidenceStripProps) {
  if (facts.length === 0) return null
  return (
    <dl aria-label={label} className={cn('flex flex-wrap gap-x-6 gap-y-3', className)}>
      {facts.map(({ label: factLabel, value, tone, icon: Icon }) => (
        <div key={factLabel} className="flex min-w-0 max-w-full flex-col gap-1">
          <dt className="label-micro">{factLabel}</dt>
          <dd
            className={cn(
              'tnum flex items-center gap-1.5 break-words text-label text-foreground',
              tone && TONE[tone],
            )}
          >
            {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
            <span className="min-w-0">{value}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}
