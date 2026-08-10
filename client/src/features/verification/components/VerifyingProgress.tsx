import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// The names of the checks the server runs, in the order it runs them.
const STEPS = [
  'Locating the document',
  'Checking issuer identity',
  'Validating the manager signature',
  'Validating the HR co-signature',
  'Recomputing the document hash',
  'Confirming the on-chain anchor',
] as const

const STEP_MS = 260

/**
 * Progress, not results. Each row shows only "in progress" or "done running" — never
 * a pass or fail, because the verdict is not known until the response lands. The
 * server answers in one shot; showing the pipeline is what makes a cryptographic
 * check legible instead of an unexplained spinner.
 */
export function VerifyingProgress() {
  const [reached, setReached] = useState(0)

  useEffect(() => {
    if (reached >= STEPS.length - 1) return
    const timer = window.setTimeout(() => setReached((n) => n + 1), STEP_MS)
    return () => window.clearTimeout(timer)
  }, [reached])

  return (
    <Card className="p-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin text-seal" />
        {/* Sole heading on the page while the request is in flight, so it is the h1;
            the verdict banner takes over the h1 role once the report lands. */}
        <h1 className="text-h3 text-foreground">Running verification…</h1>
      </div>
      <ol className="mt-4">
        {STEPS.map((step, index) => {
          const done = index < reached
          const current = index === reached
          return (
            <li
              key={step}
              className={cn(
                'flex items-center gap-3 border-b border-border py-2.5 last:border-b-0 transition-opacity',
                done || current ? 'opacity-100' : 'opacity-40',
              )}
            >
              <span className="flex size-5 shrink-0 items-center justify-center">
                {done ? (
                  <Check className="size-4 text-muted-foreground" />
                ) : current ? (
                  <Loader2 className="size-4 animate-spin text-seal" />
                ) : (
                  <span className="size-1.5 rounded-full bg-subtle" />
                )}
              </span>
              <span className="text-body text-muted-foreground">{step}</span>
            </li>
          )
        })}
      </ol>
      <span className="sr-only">Verification in progress. Results will appear when the checks complete.</span>
    </Card>
  )
}
