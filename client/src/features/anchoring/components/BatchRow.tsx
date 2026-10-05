import { ExplorerLink } from '@/components/shared/ExplorerLink'
import { HashDisplay } from '@/components/shared/HashDisplay'
import type { AnchorBatch } from '@/features/anchoring/types'
import { formatCount, formatRelativeTime } from '@/lib/format'
import { networkLabel, toBytes32 } from '@/lib/explorer'

// The root is shown 0x-prefixed so a copy pastes straight into verifyRoot on PolygonScan.
export function BatchRow({ batch }: { batch: AnchorBatch }) {
  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <HashDisplay value={toBytes32(batch.rootHash)} lead={12} tail={6} label="Copy Merkle root as bytes32" />
          <span className="text-label text-muted-foreground">{formatCount(batch.documentCount, 'document')}</span>
        </div>
        <ExplorerLink href={batch.explorerTxUrl} label="View transaction" />
      </div>
      <p className="tnum flex flex-wrap gap-x-3 gap-y-1 text-label text-subtle">
        <span>{networkLabel(batch.network)}</span>
        <span>{batch.blockNumber != null ? `Block #${batch.blockNumber}` : 'Block pending'}</span>
        <span>{formatRelativeTime(batch.anchoredAt ?? batch.createdAt)}</span>
        {batch.txHash && <span className="font-mono">tx {batch.txHash.slice(0, 10)}…{batch.txHash.slice(-6)}</span>}
      </p>
    </li>
  )
}
