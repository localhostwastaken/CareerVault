import { Check, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Step {
  key: string
  label: string
}

export interface TerminalState {
  label: string
  tone: 'revoked' | 'expired'
  icon?: LucideIcon
}

interface StepperProps {
  steps: Step[]
  /** Index of the step in progress. Everything before it is complete. */
  current: number
  /** Halts the rail — the document was revoked or expired and will not continue. */
  terminal?: TerminalState
  className?: string
}

const TERMINAL_TONE = {
  revoked: { dot: 'bg-revoked text-primary-foreground', text: 'text-revoked' },
  expired: { dot: 'bg-expired text-primary-foreground', text: 'text-expired' },
} as const

// Vertical below sm — four labelled steps on one row is unreadable at 375px.
export function Stepper({ steps, current, terminal, className }: StepperProps) {
  return (
    <ol className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-0', className)}>
      {steps.map((step, index) => {
        const complete = index < current
        // A terminal document has stopped moving, so nothing is "in progress".
        const active = index === current && !terminal
        const isLast = index === steps.length - 1

        return (
          <li
            key={step.key}
            aria-current={active ? 'step' : undefined}
            className="flex items-start gap-3 sm:flex-1 sm:items-center sm:gap-0 sm:last:flex-none"
          >
            <div className="flex items-center gap-3 sm:flex-col sm:gap-1.5">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-micro tracking-normal',
                  complete
                    ? 'bg-verified text-primary-foreground'
                    : active
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-surface-2 text-subtle',
                )}
              >
                {complete ? <Check className="size-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-label sm:whitespace-nowrap',
                  complete || active ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <span
                aria-hidden
                className={cn('mx-2 hidden h-px flex-1 sm:block', complete ? 'bg-verified' : 'bg-border')}
              />
            )}
          </li>
        )
      })}

      {terminal && (
        <li className="flex items-center gap-3 sm:gap-0">
          <span aria-hidden className="mx-2 hidden h-px w-6 bg-border sm:block" />
          <div className="flex items-center gap-3 sm:flex-col sm:gap-1.5">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full',
                TERMINAL_TONE[terminal.tone].dot,
              )}
            >
              {terminal.icon ? <terminal.icon className="size-4" /> : <X className="size-4" />}
            </span>
            <span className={cn('text-label font-medium sm:whitespace-nowrap', TERMINAL_TONE[terminal.tone].text)}>
              {terminal.label}
            </span>
          </div>
        </li>
      )}
    </ol>
  )
}
