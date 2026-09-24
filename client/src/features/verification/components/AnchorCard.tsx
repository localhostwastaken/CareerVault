import { Anchor } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ExplorerLink } from '@/components/shared/ExplorerLink'
import { HashDisplay } from '@/components/shared/HashDisplay'
import type { VerificationAnchor } from '@/features/verification/types'
import { formatDate } from '@/lib/format'

// Only chains with a public explorer get a name here (server chain-explorer.ts); an
// unlisted chain id falls back to its raw `network` string rather than guessing a label.
const NETWORK_LABEL: Record<string, string> = {
  'polygon-amoy': 'Polygon Amoy testnet',
  polygon: 'Polygon',
  'hardhat-local': 'Local Hardhat node',
  'local-simulator': 'Local simulator',
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-micro">{label}</dt>
      <dd className="tnum mt-1 text-body text-foreground">{value}</dd>
    </div>
  )
}

export function AnchorCard({ anchor }: { anchor: VerificationAnchor }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Anchor className="size-4 text-anchor" />
        <h2 className="text-h2 text-foreground">On-chain anchor</h2>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Field label="Network" value={NETWORK_LABEL[anchor.network] ?? anchor.network} />
        <Field label="Anchored" value={formatDate(anchor.anchoredAt)} />
        <div className="sm:col-span-2">
          <dt className="label-micro">Merkle root</dt>
          <dd className="mt-1">
            <HashDisplay value={anchor.rootHash} lead={16} tail={16} label="Copy Merkle root" />
          </dd>
        </div>
        {anchor.txHash && (
          <div className="sm:col-span-2">
            <dt className="label-micro">Transaction</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <HashDisplay value={anchor.txHash} lead={16} tail={16} label="Copy transaction hash" />
              <ExplorerLink href={anchor.explorerTxUrl} label="View on PolygonScan" />
            </dd>
          </div>
        )}
        <Field label="Block" value={anchor.blockNumber != null ? `#${anchor.blockNumber}` : '—'} />
        {anchor.explorerContractUrl && (
          <div>
            <dt className="label-micro">Contract</dt>
            <dd className="mt-1">
              <ExplorerLink href={anchor.explorerContractUrl} label="View contract on PolygonScan" />
            </dd>
          </div>
        )}
      </dl>
    </Card>
  )
}
