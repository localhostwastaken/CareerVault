import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { Term } from '@/components/shared/Explainer'
import { contractTabUrl, toBytes32 } from '@/lib/explorer'

interface VerifyRootStepsProps {
  rootHash: string
  /** Null for the local simulator — there is no public chain to check. */
  explorerContractUrl: string | null
}

// The step a sceptical verifier takes without trusting CareerVault at all: ask the
// registry contract on PolygonScan whether this root exists. Shown on every surface that
// shows an anchor, so a demo never has to leave the app to find the root or the contract.
export function VerifyRootSteps({ rootHash, explorerContractUrl }: VerifyRootStepsProps) {
  const readUrl = contractTabUrl(explorerContractUrl, 'readContract')

  if (!readUrl) {
    return (
      <p className="inset-well p-3 text-label text-muted-foreground">
        Anchored on the local simulator, a ledger CareerVault keeps itself. There is no public chain to check this root
        against. Deployed environments anchor on Polygon Amoy instead.
      </p>
    )
  }

  return (
    <div className="inset-well flex flex-col gap-3 p-4">
      <p className="label-micro">Check it yourself on PolygonScan</p>
      <ol className="flex flex-col gap-3 text-label text-muted-foreground">
        <li className="flex flex-col gap-2">
          <span>
            <span className="tnum font-mono text-subtle">1.</span> Open the AnchorRegistry contract&rsquo;s{' '}
            <span className="font-medium text-foreground">Read Contract</span> tab.
          </span>
          <Button asChild variant="outline" size="sm" className="self-start">
            <a href={readUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              Open Read Contract
            </a>
          </Button>
        </li>
        <li className="flex flex-col gap-2">
          <span>
            <span className="tnum font-mono text-subtle">2.</span> Copy this Merkle root, already in the{' '}
            <Term>bytes32</Term> form the contract expects.
          </span>
          <HashDisplay value={toBytes32(rootHash)} lead={18} tail={12} label="Copy Merkle root as bytes32" />
        </li>
        <li>
          <span className="tnum font-mono text-subtle">3.</span> Paste it into <Term>verifyRoot</Term> and query. The
          chain answers <Term>exists = true</Term> with the block time and the wallet that anchored it — read from
          Polygon, not from CareerVault.
        </li>
      </ol>
    </div>
  )
}
