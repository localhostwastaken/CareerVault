import { useState } from 'react'
import { ChevronDown, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EvidenceStrip } from '@/components/shared/EvidenceStrip'
import { ShapExplanation } from '@/features/recruiter/components/ShapExplanation'
import { skillCoverage } from '@/features/recruiter/skillCoverage'
import type { ShapContribution } from '@/features/recruiter/types'
import { cn } from '@/lib/utils'

export interface CandidateView {
  holderId: string
  holderName: string
  skills: string[]
  matchScore: number
  baseValue: number
  contributions: ShapContribution[]
}

const MAX_VISIBLE_SKILLS = 8

export function CandidateCard({
  candidate,
  requiredSkills,
  onMessage,
}: {
  candidate: CandidateView
  /** The opening's required skills — the evidence strip scores coverage against them. */
  requiredSkills: string[]
  onMessage?: (candidate: CandidateView) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const coverage = skillCoverage(requiredSkills, candidate.skills)
  const score = Math.max(0, Math.min(100, Math.round(candidate.matchScore * 100)))
  const overflow = candidate.skills.length - MAX_VISIBLE_SKILLS
  const initials = candidate.holderName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-label font-semibold text-accent-foreground">
            {initials}
          </span>
          <p className="truncate text-label font-semibold text-foreground">{candidate.holderName}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="tnum text-h2 text-foreground">{score}%</div>
          <div className="label-micro">match</div>
        </div>
      </div>

      {/* The bar restates the score positionally; the number above carries the value,
          so the bar itself needs no separate label. */}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Match score for ${candidate.holderName}`}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
      </div>

      {candidate.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {candidate.skills.slice(0, MAX_VISIBLE_SKILLS).map((skill) => (
            <Badge key={skill} variant="neutral">
              {skill}
            </Badge>
          ))}
          {overflow > 0 && <Badge variant="neutral">+{overflow} more</Badge>}
        </div>
      )}

      {coverage.required.length > 0 && (
        <EvidenceStrip
          label={`Match evidence for ${candidate.holderName}`}
          className="border-t border-border pt-3"
          facts={[
            {
              label: 'Required skills',
              value: `${coverage.matched.length} of ${coverage.required.length} matched`,
            },
            { label: 'Matched', value: coverage.matched.join(', ') || 'None' },
            ...(coverage.missing.length > 0 ? [{ label: 'Missing', value: coverage.missing.join(', ') }] : []),
          ]}
        />
      )}

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
          <ChevronDown className={cn('transition-transform', isOpen && 'rotate-180')} />
          Why this match
        </Button>
        {onMessage && (
          <Button variant="secondary" size="sm" className="ml-auto" onClick={() => onMessage(candidate)}>
            <Mail />
            Message
          </Button>
        )}
      </div>

      {isOpen && (
        <ShapExplanation
          contributions={candidate.contributions}
          baseValue={candidate.baseValue}
          matchScore={candidate.matchScore}
        />
      )}
    </Card>
  )
}
