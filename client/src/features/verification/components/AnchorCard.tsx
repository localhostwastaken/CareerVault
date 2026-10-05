import { Anchor } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Explainer } from '@/components/shared/Explainer'
import { AnchorRecord } from '@/features/anchoring/components/AnchorRecord'
import { ANCHORING_STEPS } from '@/features/anchoring/anchoringSteps'
import type { VerificationAnchor } from '@/features/verification/types'

export function AnchorCard({ anchor }: { anchor: VerificationAnchor }) {
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div>
        <div className="flex items-center gap-2">
          <Anchor className="size-4 text-anchor" />
          <h2 className="text-h2 text-foreground">On-chain anchor</h2>
        </div>
        <p className="mt-0.5 text-body text-muted-foreground">
          This document&rsquo;s hash is a leaf in the Merkle tree whose root was written to the public ledger below.
        </p>
      </div>
      <AnchorRecord anchor={anchor} />
      <Explainer
        title="How a document gets anchored"
        summary="Five steps from an issued document to a root on Polygon."
        steps={ANCHORING_STEPS}
      />
    </Card>
  )
}
