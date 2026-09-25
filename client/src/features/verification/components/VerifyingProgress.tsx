import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

// Mirrors the labels verification.service.ts returns, in the order it returns them.
const CHECKS = [
  'Document on record',
  'Content integrity',
  'Issuer signature',
  'Approver signature',
  'Blockchain anchor',
  'Revocation status',
] as const

/**
 * The server answers every check in one round-trip, so there is no per-check progress
 * to show. The list names what is being checked; no row claims a result until the
 * report replaces this card.
 */
export function VerifyingProgress() {
  return (
    <Card className="p-6" aria-busy="true">
      <div className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin text-seal" aria-hidden />
        {/* Sole heading on the page while the request is in flight, so it is the h1;
            the verdict banner takes over the h1 role once the report lands. */}
        <h1 className="text-h3 text-foreground">Running verification…</h1>
      </div>
      <p className="mt-1 text-body text-muted-foreground">
        All six checks run together. Results appear when the whole verification completes.
      </p>
      <ol className="mt-4">
        {CHECKS.map((check, index) => (
          <li key={check} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
            <span className="tnum flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-micro tracking-normal text-subtle">
              {index + 1}
            </span>
            <span className="text-body text-muted-foreground">{check}</span>
          </li>
        ))}
      </ol>
      <p className="sr-only" role="status">
        Verification in progress. Results will appear when the checks complete.
      </p>
    </Card>
  )
}
