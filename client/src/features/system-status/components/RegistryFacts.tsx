import type { ReactNode } from 'react'
import { Anchor, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EvidenceStripSkeleton } from '@/components/shared/Skeletons'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { Notice } from '@/components/shared/Notice'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { useGetSystemStatusQuery } from '@/features/system-status/api'
import type { SystemStatus } from '@/features/system-status/types'
import { contractTabUrl, networkLabel } from '@/lib/explorer'

function LinkButton({ href, children }: { href: string | null; children: ReactNode }) {
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

function Row({ label, value, actions }: { label: string; value: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <dt className="label-micro">{label}</dt>
        <dd className="tnum min-w-0 text-body text-foreground">{value}</dd>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

function Registry({ chain }: { chain: SystemStatus['blockchain'] }) {
  if (chain.driver === 'local') {
    return (
      <Notice tone="pending" title="Anchoring is simulated in this environment">
        This server writes Merkle roots to a local JSON ledger, not to Polygon, so there is nothing to open on
        PolygonScan here. The deployed stack anchors on Polygon Amoy.
      </Notice>
    )
  }
  return (
    <dl>
      <Row label="Network" value={`${networkLabel(chain.network)} · chain id ${chain.chainId ?? '—'}`} />
      {chain.contractAddress && (
        <Row
          label="AnchorRegistry contract (source-verified)"
          value={<HashDisplay value={chain.contractAddress} lead={10} tail={8} label="Copy contract address" />}
          actions={
            <>
              <LinkButton href={chain.explorerContractUrl}>Contract</LinkButton>
              <LinkButton href={contractTabUrl(chain.explorerContractUrl, 'events')}>Anchor events</LinkButton>
            </>
          }
        />
      )}
      {chain.walletAddress && (
        <Row
          label="Anchor wallet (pays for every anchor)"
          value={<HashDisplay value={chain.walletAddress} lead={10} tail={8} label="Copy wallet address" />}
          actions={<LinkButton href={chain.explorerWalletUrl}>Wallet history</LinkButton>}
        />
      )}
    </dl>
  )
}

// Where this deployment writes its anchors, read from the server's own configuration —
// so the contract a demo points at is the one the API really uses, not a hardcoded guess.
export function RegistryFacts() {
  const query = useGetSystemStatusQuery()

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <div className="flex items-center gap-2">
          <Anchor className="size-4 text-anchor" aria-hidden />
          <h2 className="text-h2 text-foreground">Public ledger</h2>
        </div>
        <p className="mt-0.5 text-body text-muted-foreground">
          Every batch of issued documents is committed here as one 32-byte Merkle root. Anyone can inspect it.
        </p>
      </div>
      <QueryBoundary
        query={query}
        skeleton={<EvidenceStripSkeleton count={3} />}
        errorTitle="Couldn't load the ledger details"
        headingLevel={3}
      >
        {(status) => <Registry chain={status.blockchain} />}
      </QueryBoundary>
    </Card>
  )
}
