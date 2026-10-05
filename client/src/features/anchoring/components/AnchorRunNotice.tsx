import { ExplorerLink } from '@/components/shared/ExplorerLink'
import { Notice } from '@/components/shared/Notice'
import type { AnchorBatch, AnchorRunResult } from '@/features/anchoring/types'
import { formatCount, truncateHash } from '@/lib/format'

interface AnchorRunNoticeProps {
  result: AnchorRunResult
  /** The refreshed batch list; the new batch in it carries the explorer link. */
  batches: AnchorBatch[] | undefined
}

// Act III of "Anchor now". A toast vanished before a demo could click it; this stays, with
// the transaction link, until the next run. "0 anchored" alone can mean a batch was already
// running or that the integrity gate held documents back, so neither may read as success.
export function AnchorRunNotice({ result, batches }: AnchorRunNoticeProps) {
  const { anchored, skipped, busy, rootHash, txHash } = result
  const batch = rootHash ? batches?.find((b) => b.rootHash === rootHash) : undefined

  if (busy) {
    return <Notice tone="neutral" title="A batch is already running">Try again once it finishes.</Notice>
  }
  return (
    <div className="flex flex-col gap-3">
      {anchored > 0 && (
        <Notice
          tone="verified"
          title={`Anchored ${formatCount(anchored, 'document')} on-chain`}
          actions={<ExplorerLink href={batch?.explorerTxUrl ?? null} label="Open the transaction on PolygonScan" />}
        >
          {txHash ? (
            <>
              Transaction <span className="tnum font-mono">{truncateHash(txHash, 10, 8)}</span> is confirmed. Every
              document in the batch now verifies as Verified, with this transaction as its receipt.
            </>
          ) : (
            'The root is recorded. Every document in the batch now verifies as Verified.'
          )}
        </Notice>
      )}
      {skipped > 0 && (
        <Notice tone="revoked" title={`${formatCount(skipped, 'document')} failed the integrity gate`}>
          {skipped === 1 ? 'It was' : 'They were'} left un-anchored: the stored content no longer reproduces its hash, or
          it can&rsquo;t be decrypted. The server log names {skipped === 1 ? 'it' : 'them'}.
        </Notice>
      )}
      {anchored === 0 && skipped === 0 && (
        <Notice tone="neutral" title="Nothing to anchor">
          No issued document is waiting for a batch. Issue one, then anchor again.
        </Notice>
      )}
    </div>
  )
}
