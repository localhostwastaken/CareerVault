import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { VerifyRootSteps } from '@/features/anchoring/components/VerifyRootSteps'
import { formatDateTime } from '@/lib/format'
import { networkLabel } from '@/lib/explorer'

// The common shape of an anchor across the verify response, the document detail and the
// batch list, so one component renders all of them the same way.
export interface AnchorRecordData {
  network: string
  anchoredAt: string | null
  blockNumber: number | null
  rootHash: string
  txHash: string | null
  contractAddress: string | null
  explorerTxUrl: string | null
  explorerContractUrl: string | null
}

function Field({ label, children, isWide }: { label: string; children: ReactNode; isWide?: boolean }) {
  return (
    <div className={isWide ? 'flex min-w-0 flex-col gap-1 sm:col-span-2' : 'flex min-w-0 flex-col gap-1'}>
      <dt className="label-micro">{label}</dt>
      <dd className="tnum min-w-0 text-body text-foreground">{children}</dd>
    </div>
  )
}

function ExternalButton({ href, children }: { href: string | null; children: ReactNode }) {
  if (!href) return null
  return (
    <Button asChild variant="outline" size="sm">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink />
        {children}
      </a>
    </Button>
  )
}

export function AnchorRecord({ anchor }: { anchor: AnchorRecordData }) {
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Field label="Network">{networkLabel(anchor.network)}</Field>
        <Field label="Anchored">{formatDateTime(anchor.anchoredAt)}</Field>
        <Field label="Block">{anchor.blockNumber != null ? `#${anchor.blockNumber}` : '—'}</Field>
        <Field label="Registry contract">
          {anchor.contractAddress ? (
            <HashDisplay value={anchor.contractAddress} lead={10} tail={8} label="Copy contract address" />
          ) : (
            'None (simulated)'
          )}
        </Field>
        <Field label="Merkle root" isWide>
          <HashDisplay value={anchor.rootHash} lead={16} tail={16} label="Copy Merkle root" />
        </Field>
        {anchor.txHash && (
          <Field label="Anchoring transaction" isWide>
            <HashDisplay value={anchor.txHash} lead={16} tail={16} label="Copy transaction hash" />
          </Field>
        )}
      </dl>

      {(anchor.explorerTxUrl || anchor.explorerContractUrl) && (
        <div className="flex flex-wrap gap-2">
          <ExternalButton href={anchor.explorerTxUrl}>View transaction on PolygonScan</ExternalButton>
          <ExternalButton href={anchor.explorerContractUrl}>View contract on PolygonScan</ExternalButton>
        </div>
      )}

      <VerifyRootSteps rootHash={anchor.rootHash} explorerContractUrl={anchor.explorerContractUrl} />
    </div>
  )
}
