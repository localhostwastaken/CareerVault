import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Small uppercase context line above the title, e.g. the portal name. */
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

// Act I of every screen: where am I, what is this, what can I do from here.
// The title is the page's only h1 and sets it in the serif ceremony face.
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="label-micro mb-1.5">{eyebrow}</p>}
        <h1 className="font-serif text-h1 text-foreground">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-body text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
