import { useState } from 'react'
import { Anchor, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { Explainer } from '@/components/shared/Explainer'
import { ListSkeleton } from '@/components/shared/Skeletons'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { useListAnchorBatchesQuery, useRunAnchorBatchMutation } from '@/features/anchoring/api'
import { ANCHORING_STEPS } from '@/features/anchoring/anchoringSteps'
import { AnchoringInProgress } from '@/features/anchoring/components/AnchoringInProgress'
import { AnchorRunNotice } from '@/features/anchoring/components/AnchorRunNotice'
import { BatchRow } from '@/features/anchoring/components/BatchRow'
import type { AnchorRunResult } from '@/features/anchoring/types'
import { useGetSystemStatusQuery } from '@/features/system-status/api'
import { contractTabUrl, networkLabel } from '@/lib/explorer'
import { toastApiError } from '@/lib/notify'

// Where "Anchor now" writes. Decorative context for the card, so while the status is
// loading or unavailable it simply says nothing rather than a second error state.
function TargetLine() {
  const chain = useGetSystemStatusQuery().data?.blockchain
  if (!chain) return null
  if (chain.driver === 'local') {
    return <p className="text-label text-pending">This environment anchors to a local simulated ledger, not Polygon.</p>
  }
  const readUrl = contractTabUrl(chain.explorerContractUrl, 'readContract')
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-muted-foreground">
      <span>
        Writes to {networkLabel(chain.network)} via the AnchorRegistry contract
        {chain.contractAddress && (
          <span className="tnum font-mono text-foreground"> {chain.contractAddress.slice(0, 8)}…{chain.contractAddress.slice(-6)}</span>
        )}
        .
      </span>
      {readUrl && (
        <a
          href={readUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex items-center gap-1.5 rounded font-medium text-seal hover:underline"
        >
          Check a root on PolygonScan
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </p>
  )
}

export function AnchoringCard() {
  const query = useListAnchorBatchesQuery()
  const [runBatch, { isLoading }] = useRunAnchorBatchMutation()
  const [lastRun, setLastRun] = useState<AnchorRunResult | null>(null)
  const isSimulated = useGetSystemStatusQuery().data?.blockchain.driver === 'local'

  const onAnchor = async () => {
    try {
      setLastRun(await runBatch().unwrap())
    } catch (error) {
      toastApiError(error, 'Could not anchor the batch')
    }
  }

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2">
          <Anchor className="mt-0.5 size-4 shrink-0 text-anchor" />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-h2 text-foreground">Blockchain anchoring</h2>
            <p className="max-w-xl text-body text-muted-foreground">
              Issued documents are batched into a Merkle tree and the 32-byte root is written on-chain. This runs every
              midnight; &ldquo;Anchor now&rdquo; runs it immediately.
            </p>
            <TargetLine />
          </div>
        </div>
        <Button onClick={onAnchor} disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : <Anchor />}
          {isLoading ? 'Anchoring…' : 'Anchor now'}
        </Button>
      </div>

      {isLoading && <AnchoringInProgress isSimulated={isSimulated} />}
      {!isLoading && lastRun && <AnchorRunNotice result={lastRun} batches={query.data} />}

      <QueryBoundary
        query={query}
        skeleton={<ListSkeleton rows={3} />}
        empty={
          <EmptyState
            icon={Anchor}
            headingLevel={3}
            title="No batches yet"
            description="Click “Anchor now” to write the first Merkle root on-chain."
          />
        }
        errorTitle="Couldn't load anchor batches"
        headingLevel={3}
      >
        {(batches) => (
          <div className="flex flex-col gap-1">
            <p className="label-micro">Recent batches · newest first</p>
            <ul className="flex flex-col">
              {batches.map((batch) => (
                <BatchRow key={batch.id} batch={batch} />
              ))}
            </ul>
          </div>
        )}
      </QueryBoundary>

      <Explainer
        title="What “Anchor now” does"
        summary="Five steps from issued documents to one root on the public ledger."
        steps={ANCHORING_STEPS}
      />
    </Card>
  )
}
