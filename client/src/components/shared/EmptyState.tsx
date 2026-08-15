import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Heading, type HeadingLevel } from '@/components/shared/Heading'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  /** An empty state without a next step is just a dead end — pass one wherever the user can act. */
  action?: ReactNode
  /** 2 when this is the page's whole body, 3 when nested under a Section's h2. */
  headingLevel?: HeadingLevel
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, headingLevel = 2, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-rule-strong bg-card px-6 py-14 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
          <Icon className="size-5" />
        </div>
      )}
      <Heading level={headingLevel} className="text-h3 text-foreground">
        {title}
      </Heading>
      {description && <p className="mt-1.5 max-w-sm text-body text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
