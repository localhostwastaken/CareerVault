import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/notify'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  description?: string
  /** Raw RTK Query error — its message is surfaced when no description is given. */
  error?: unknown
  onRetry?: () => void
  className?: string
}

// The missing sibling of EmptyState. Before this existed a failed fetch fell through
// to "No documents yet", telling users their data did not exist.
export function ErrorState({ title = "That didn't load", description, error, onRetry, className }: ErrorStateProps) {
  const detail = description ?? apiErrorMessage(error, 'The server did not respond. Check your connection and try again.')

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-revoked/30 bg-revoked-soft px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-card text-revoked">
        <AlertTriangle className="size-5" />
      </div>
      <h3 className="text-h3 text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-body text-muted-foreground">{detail}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RotateCcw />
          Try again
        </Button>
      )}
    </div>
  )
}
