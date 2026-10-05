import { CheckCircle2, Clock, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHECK_EXPLANATIONS } from '@/features/verification/checkExplanations'
import type { VerificationCheck } from '@/features/verification/types'

// Icon + word + colour. A colourblind reader gets the same answer as anyone else.
const STATUS: Record<VerificationCheck['status'], { icon: LucideIcon; color: string; word: string }> = {
  pass: { icon: CheckCircle2, color: 'text-verified', word: 'Passed' },
  fail: { icon: XCircle, color: 'text-revoked', word: 'Failed' },
  pending: { icon: Clock, color: 'text-pending', word: 'Pending' },
}

interface CheckRowProps {
  check: VerificationCheck
  step: number
  /** Adds the plain-language "how this check works" line under the result. */
  isExplained?: boolean
}

export function CheckRow({ check, step, isExplained }: CheckRowProps) {
  const { icon: Icon, color, word } = STATUS[check.status]
  const explanation = CHECK_EXPLANATIONS[check.key]

  return (
    <li className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
      <span className="tnum mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-micro tracking-normal text-subtle">
        {step}
      </span>
      <Icon className={cn('mt-0.5 size-5 shrink-0', color)} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-label font-semibold text-foreground">{check.label}</p>
        <p className="text-body text-muted-foreground">{check.detail}</p>
        {isExplained && explanation && (
          <p className="inset-well mt-1.5 px-3 py-2 text-label text-muted-foreground">
            <span className="font-semibold text-foreground">How: </span>
            {explanation}
          </p>
        )}
      </div>
      <span className={cn('shrink-0 text-micro', color)}>{word}</span>
    </li>
  )
}
