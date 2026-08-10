import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// Router-level catch. Attached as `errorElement` on each layout route so a throw
// inside one screen degrades to a recoverable page instead of a blank document.
export function RouteErrorBoundary() {
  const error = useRouteError()

  const status = isRouteErrorResponse(error) ? error.status : null
  const title = status === 404 ? 'Page not found' : 'Something went wrong'
  const detail =
    status === 404
      ? "That address doesn't match anything in CareerVault."
      : 'This screen failed to render. Reloading usually clears it — if not, the error below helps us fix it.'
  const message = error instanceof Error ? error.message : isRouteErrorResponse(error) ? error.statusText : null

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-revoked-soft text-revoked">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="font-serif text-h1 text-foreground">{title}</h1>
        <p className="mt-2 text-body text-muted-foreground">{detail}</p>
        {message && (
          <p className="inset-well mt-4 break-words px-3 py-2 text-left font-mono text-micro normal-case tracking-normal text-muted-foreground">
            {message}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => window.location.reload()}>
            <RotateCcw />
            Reload
          </Button>
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft />
              Back to start
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
