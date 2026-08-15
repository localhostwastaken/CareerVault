import { Anchor, CircleCheck, Clock, ShieldOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Stepper } from '@/components/shared/Stepper'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { MILESTONES, documentProgress } from '@/features/document/documentProgress'
import type { DocumentDetail } from '@/features/document/types'
import { cn } from '@/lib/utils'

const TONE = {
  pending: { wrap: 'bg-pending-soft border-pending/25', text: 'text-pending', icon: Clock },
  verified: { wrap: 'bg-verified-soft border-verified/25', text: 'text-verified', icon: CircleCheck },
  revoked: { wrap: 'bg-revoked-soft border-revoked/25', text: 'text-revoked', icon: ShieldOff },
  neutral: { wrap: 'bg-surface-2 border-border', text: 'text-muted-foreground', icon: Clock },
} as const

// Status badge + milestone rail + a sentence saying who has it and what happens next.
// The sentence is the point: the badge alone never told the holder anything actionable.
export function DocumentProgress({ document }: { document: DocumentDetail }) {
  const progress = documentProgress(document)
  const tone = TONE[progress.tone]
  const Icon = tone.icon

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={document.status} />
        {document.merkleStatus === 'ANCHORED' && (
          <Badge variant="anchor">
            <Anchor />
            On-chain
          </Badge>
        )}
        {document.merkleStatus === 'PENDING_BATCH' && (
          <Badge variant="pending">
            <Anchor />
            Awaiting anchor
          </Badge>
        )}
        <span className="tnum ml-auto text-micro text-subtle">Version {document.version}</span>
      </div>

      <div className={cn('flex items-start gap-3 rounded-lg border p-4', tone.wrap)}>
        <Icon className={cn('mt-0.5 size-5 shrink-0', tone.text)} />
        <div className="min-w-0">
          <p className="text-label font-semibold text-foreground">{progress.headline}</p>
          {progress.detail && <p className="mt-1 text-body text-muted-foreground">{progress.detail}</p>}
        </div>
      </div>

      <Stepper steps={MILESTONES} current={progress.completed} terminal={progress.terminal} />
    </Card>
  )
}
