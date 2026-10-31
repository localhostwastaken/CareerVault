import { Anchor, ExternalLink } from 'lucide-react'
import type { AnchorBadgeInfo, AnchorStatus } from '@/features/verification/types'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const LABEL: Record<AnchorStatus, string> = {
  anchored: 'Timestamped on-chain',
  pending: 'On-chain timestamp pending',
  unconfirmed: 'On-chain timestamp not confirmed',
  unavailable: 'Chain unreachable right now',
}

// Secondary by design: the verdict above comes from our own checks and never from the chain.
// This badge only says whether the document's batch also has a public, timestamped receipt.
export function AnchorBadge({ anchor }: { anchor: AnchorBadgeInfo }) {
  const isAnchored = anchor.status === 'anchored'
  return (
    <p
      className={cn(
        'mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-full border px-2.5 py-1 text-micro',
        isAnchored ? 'border-anchor/25 bg-anchor-soft text-anchor' : 'border-border bg-surface-2 text-muted-foreground',
      )}
    >
      <Anchor className="size-3.5" aria-hidden />
      {LABEL[anchor.status]}
      {isAnchored && anchor.network && <span>· {anchor.network}</span>}
      {isAnchored && anchor.anchoredAt && <span>· {formatDate(anchor.anchoredAt)}</span>}
      {anchor.explorerTxUrl && (
        <a
          href={anchor.explorerTxUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex items-center gap-1 rounded-sm underline underline-offset-2"
        >
          View transaction
          <ExternalLink className="size-3" aria-hidden />
        </a>
      )}
    </p>
  )
}
