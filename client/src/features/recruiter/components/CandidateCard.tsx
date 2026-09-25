import { useState } from 'react'
import { ChevronDown, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CandidateEvidence } from '@/features/recruiter/components/CandidateEvidence'
import { ShapExplanation } from '@/features/recruiter/components/ShapExplanation'
import type { CredentialEvidence, ShapContribution } from '@/features/recruiter/types'
import { cn } from '@/lib/utils'

export interface CandidateView {
  holderId: string
  holderName: string
  skills: string[]
  evidence?: CredentialEvidence
  matchScore: number
  baseValue: number
  contributions: ShapContribution[]
}

const MAX_VISIBLE_SKILLS = 8

// One record, two columns on wide screens: who the candidate is and what they can prove
// on the left, why the model ranked them where it did on the right. Narrower screens
// keep the reasoning behind a disclosure so results stay scannable.
export function CandidateCard({
  candidate,
  requiredSkills,
  onMessage,
}: {
  candidate: CandidateView
  /** The opening's required skills — coverage is scored against them. */
  requiredSkills: string[]
  onMessage?: (candidate: CandidateView) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const score = Math.max(0, Math.min(100, Math.round(candidate.matchScore * 100)))
  const overflow = candidate.skills.length - MAX_VISIBLE_SKILLS
  const initials = candidate.holderName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const reasoningId = `reasoning-${candidate.holderId}`

  return (
    <Card className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-6">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-label font-semibold text-accent-foreground">
              {initials}
            </span>
            <h3 className="truncate text-h3 text-foreground">{candidate.holderName}</h3>
          </div>
          <div className="shrink-0 text-right">
            <div className="tnum text-h2 text-foreground">{score}%</div>
            <div className="label-micro">match</div>
          </div>
        </div>

        {/* The bar restates the score positionally; the number above carries the value. */}
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

        <CandidateEvidence
          holderName={candidate.holderName}
          evidence={candidate.evidence}
          skills={candidate.skills}
          requiredSkills={requiredSkills}
        />

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="xl:hidden"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls={reasoningId}
          >
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
      </div>

      <section
        id={reasoningId}
        aria-label={`Ranking reasoning for ${candidate.holderName}`}
        className={cn('flex-col gap-2 xl:flex xl:border-l xl:border-border xl:pl-6', isOpen ? 'flex' : 'hidden')}
      >
        <p className="label-micro">Why this rank</p>
        <ShapExplanation
          contributions={candidate.contributions}
          baseValue={candidate.baseValue}
          matchScore={candidate.matchScore}
        />
      </section>
    </Card>
  )
}
