import type { ReactNode } from 'react'
import { ChevronDown, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ExplainerStep {
  title: string
  body: ReactNode
}

interface ExplainerProps {
  /** Defaults to "What's happening here". */
  title?: string
  /** One line that stays visible while collapsed, so the hint earns its click. */
  summary?: string
  steps: ExplainerStep[]
  footer?: ReactNode
  isOpen?: boolean
  className?: string
}

// The "under the hood" note beside a screen: what the system does, in order, when the
// person on this screen acts. A native <details> keeps it keyboard- and screen-reader-
// operable with no state, and printing a verification report keeps it expanded.
export function Explainer({ title = 'What’s happening here', summary, steps, footer, isOpen, className }: ExplainerProps) {
  return (
    <details open={isOpen} className={cn('group rounded-xl border border-border bg-card', className)}>
      <summary className="focus-ring flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-seal" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-label font-semibold text-foreground">{title}</span>
          {summary && <span className="mt-0.5 block text-label text-muted-foreground">{summary}</span>}
        </span>
        <ChevronDown
          className="mt-0.5 size-4 shrink-0 text-subtle transition-transform duration-200 ease-out group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="flex flex-col gap-4 border-t border-border px-4 pb-4 pt-3">
        <ol className="flex flex-col">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 border-b border-border py-2.5 last:border-b-0"
            >
              <span className="tnum pt-px font-mono text-micro text-subtle">{String(index + 1).padStart(2, '0')}</span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-label font-semibold text-foreground">{step.title}</p>
                <div className="break-words text-label text-muted-foreground">{step.body}</div>
              </div>
            </li>
          ))}
        </ol>
        {footer && <div className="text-label text-muted-foreground">{footer}</div>}
      </div>
    </details>
  )
}

/** Inline mono token for code-like terms inside explainer copy (function names, fields). */
export function Term({ children }: { children: ReactNode }) {
  return <code className="tnum rounded bg-surface-2 px-1 font-mono text-micro normal-case text-foreground">{children}</code>
}
