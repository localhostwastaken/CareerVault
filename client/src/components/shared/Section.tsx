import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

// Standardizes the "h2 + optional action + body" block that ~10 pages hand-rolled,
// each picking its own heading size. h2 is 18px here — it used to be 14px, which
// rendered section headings smaller than the body text beneath them.
export function Section({ title, description, actions, children, className }: SectionProps) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-h2 text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-body text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}
