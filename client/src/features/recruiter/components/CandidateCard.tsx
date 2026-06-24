import { useState } from 'react'
import { ChevronDown, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ShapExplanation } from '@/features/recruiter/components/ShapExplanation'
import type { ShapContribution } from '@/features/recruiter/types'

export interface CandidateView {
  holderId: string
  holderName: string
  skills: string[]
  matchScore: number
  baseValue: number
  contributions: ShapContribution[]
}

export function CandidateCard({
  candidate,
  onMessage,
}: {
  candidate: CandidateView
  onMessage?: (candidate: CandidateView) => void
}) {
  const [open, setOpen] = useState(false)
  const score = Math.max(0, Math.min(100, Math.round(candidate.matchScore * 100)))
  const initials = candidate.holderName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {initials}
          </span>
          <p className="font-semibold text-foreground">{candidate.holderName}</p>
        </div>
        <div className="text-right">
          <div className="tnum text-lg font-bold text-primary">{score}%</div>
          <div className="text-xs text-subtle">match</div>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
      </div>

      {candidate.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {candidate.skills.slice(0, 8).map((skill) => (
            <Badge key={skill} variant="neutral">
              {skill}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          <ChevronDown className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
          Why this match
        </Button>
        {onMessage && (
          <Button variant="secondary" size="sm" className="ml-auto" onClick={() => onMessage(candidate)}>
            <Mail />
            Message
          </Button>
        )}
      </div>

      {open && (
        <ShapExplanation
          contributions={candidate.contributions}
          baseValue={candidate.baseValue}
          matchScore={candidate.matchScore}
        />
      )}
    </Card>
  )
}
