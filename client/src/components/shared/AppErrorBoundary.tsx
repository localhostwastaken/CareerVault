import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Outermost net, above the router. Catches throws the router cannot see — the
// RouterProvider itself, the store, or a bad lazy chunk.
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No telemetry sink yet; the console keeps the component stack recoverable in dev.
    console.error('Unhandled render error', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-revoked-soft text-revoked">
            <AlertTriangle className="size-5" />
          </div>
          <h1 className="font-serif text-h1 text-foreground">CareerVault hit an error</h1>
          <p className="mt-2 text-body text-muted-foreground">
            The app stopped unexpectedly. Reloading will start a fresh session — your documents are unaffected.
          </p>
          <p className="inset-well mt-4 break-words px-3 py-2 text-left font-mono text-micro normal-case tracking-normal text-muted-foreground">
            {error.message}
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            <RotateCcw />
            Reload CareerVault
          </Button>
        </Card>
      </div>
    )
  }
}
