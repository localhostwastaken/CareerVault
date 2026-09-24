import { Anchor, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExplorerLink } from '@/components/shared/ExplorerLink'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { ListSkeleton } from '@/components/shared/Skeletons'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { useListAnchorBatchesQuery, useRunAnchorBatchMutation } from '@/features/anchoring/api'
import type { AnchorBatch } from '@/features/anchoring/types'
import { formatNumber, formatRelativeTime, truncateHash } from '@/lib/format'
import { notify, toastApiError } from '@/lib/notify'

function BatchRow({ batch }: { batch: AnchorBatch }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <HashDisplay value={batch.rootHash} lead={10} tail={6} label="Copy Merkle root" />
        <span className="text-label text-muted-foreground">
          {formatNumber(batch.documentCount)} document{batch.documentCount === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="tnum text-label text-muted-foreground">
          {batch.blockNumber != null ? `Block #${batch.blockNumber}` : 'Block pending'}
        </span>
        <span className="text-label text-muted-foreground">{formatRelativeTime(batch.anchoredAt ?? batch.createdAt)}</span>
        <ExplorerLink href={batch.explorerTxUrl} label="View" />
      </div>
    </li>
  )
}

export function AnchoringCard() {
  const query = useListAnchorBatchesQuery()
  const [runBatch, { isLoading }] = useRunAnchorBatchMutation()

  const onAnchor = async () => {
    try {
      const result = await runBatch().unwrap()
      if (result.anchored === 0) {
        notify.info('Nothing to anchor — every issued document is already on-chain.')
        return
      }
      notify.success(
        `Anchored ${result.anchored} document${result.anchored === 1 ? '' : 's'} · tx ${truncateHash(result.txHash, 10, 8)}`,
      )
    } catch (error) {
      toastApiError(error, 'Could not anchor the batch')
    }
  }

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <Anchor className="mt-0.5 size-4 shrink-0 text-anchor" />
          <div>
            <h2 className="text-h2 text-foreground">Blockchain anchoring</h2>
            <p className="mt-0.5 max-w-md text-body text-muted-foreground">
              Issued documents are batched into a Merkle tree; the 32-byte root is written to the
              AnchorRegistry contract.
            </p>
          </div>
        </div>
        <Button onClick={onAnchor} disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : <Anchor />}
          {isLoading ? 'Anchoring…' : 'Anchor now'}
        </Button>
      </div>

      {isLoading && (
        <p role="status" className="-mt-2 text-label text-muted-foreground">
          Submitting to Polygon — this can take up to a minute.
        </p>
      )}

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
          <ul className="flex flex-col">
            {batches.map((batch) => (
              <BatchRow key={batch.id} batch={batch} />
            ))}
          </ul>
        )}
      </QueryBoundary>
    </Card>
  )
}
