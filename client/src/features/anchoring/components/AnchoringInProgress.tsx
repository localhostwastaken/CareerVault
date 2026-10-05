import { Loader2 } from 'lucide-react'
import { ANCHORING_STEPS } from '@/features/anchoring/anchoringSteps'

// The server answers "Anchor now" in one call, so there is no per-step progress to show.
// This names what is being done; no row claims to be finished until the result lands.
export function AnchoringInProgress({ isSimulated }: { isSimulated: boolean }) {
  return (
    <div role="status" className="inset-well flex flex-col gap-3 p-4">
      <p className="flex items-center gap-2 text-label font-semibold text-foreground">
        <Loader2 className="size-4 animate-spin text-seal" aria-hidden />
        {isSimulated ? 'Anchoring to the local ledger…' : 'Anchoring on Polygon. This can take up to a minute…'}
      </p>
      <ol className="flex flex-col gap-1.5">
        {ANCHORING_STEPS.map((step, index) => (
          <li key={step.title} className="flex items-center gap-2 text-label text-muted-foreground">
            <span className="tnum font-mono text-micro text-subtle">{String(index + 1).padStart(2, '0')}</span>
            {step.title}
          </li>
        ))}
      </ol>
    </div>
  )
}
