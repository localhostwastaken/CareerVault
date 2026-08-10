import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

interface AuthShellProps {
  title: string
  description?: string
  children: ReactNode
  /** Sign-in / register cross-links and other escape hatches. */
  footer?: ReactNode
}

// Login, Register and MagicLink all framed themselves independently and drifted.
// One shell keeps the auth flow feeling like a single continuous step.
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  useDocumentTitle(title)

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 flex flex-col gap-1.5">
        <h1 className="font-serif text-h1 text-foreground">{title}</h1>
        {description && <p className="text-body text-muted-foreground">{description}</p>}
      </div>
      <Card className="p-6">{children}</Card>
      {footer && <div className="mt-6 flex flex-col gap-2 text-center text-body text-muted-foreground">{footer}</div>}
    </div>
  )
}
