import { Link } from 'react-router-dom'
import { Anchor, Clock, ExternalLink, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CopyButton } from '@/components/shared/CopyButton'
import { Explainer } from '@/components/shared/Explainer'
import { Notice } from '@/components/shared/Notice'
import { AnchorRecord } from '@/features/anchoring/components/AnchorRecord'
import { ANCHORING_STEPS } from '@/features/anchoring/anchoringSteps'
import type { DocumentDetail } from '@/features/document/types'
import { useAuth } from '@/hooks/useAuth'


function PendingAnchor({ document }: { document: DocumentDetail }) {
  const { role, activeOrgId } = useAuth()
  const canAnchor = role === 'ORG_ADMIN' && activeOrgId === document.organizationId

  return (
    <Notice
      tone="pending"
      icon={Clock}
      title="Waiting for the next anchoring batch"
      actions={
        canAnchor && (
          <Button asChild size="sm" variant="outline">
            <Link to="/app/analytics">
              <Anchor />
              Anchor now from Analytics
            </Link>
          </Button>
        )
      }
    >
      The document is already valid: both signatures and its hash verify today. Batches run at midnight, or when an
      organisation admin clicks “Anchor now”. After that, the transaction and the PolygonScan links appear here.
    </Notice>
  )
}

// The document's own place on the public ledger: its batch's root, transaction and
// contract, plus the one-click public verification a demo reaches for next. The anchor is a
// secondary, public timestamp; verification itself never depends on it.
export function DocumentAnchorCard({ document }: { document: DocumentDetail }) {
  const anchor = document.anchor
  const verifyPath = `/verify/${document.id}`
  const isIssued = Boolean(document.documentHash && document.hasHrSignature)

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Anchor className="size-4 text-anchor" aria-hidden />
            <h2 className="text-h2 text-foreground">On-chain proof</h2>
          </div>
          <p className="mt-0.5 max-w-xl text-body text-muted-foreground">
            Where this document&rsquo;s batch was timestamped on Polygon. A secondary receipt: the verdict comes from
            our own checks, never from the chain.
          </p>
        </div>
        {isIssued && (
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild size="sm">
              <a href={verifyPath} target="_blank" rel="noopener noreferrer">
                <ScanLine />
                Run public verification
                <ExternalLink />
              </a>
            </Button>
            <CopyButton value={`${window.location.origin}${verifyPath}`} label="Copy public verification link" />
          </div>
        )}
      </div>

      {anchor ? (
        <AnchorRecord anchor={{ ...anchor, rootHash: anchor.merkleRoot }} />
      ) : document.status === 'ISSUED' ? (
        <PendingAnchor document={document} />
      ) : (
        <p className="inset-well p-3 text-body text-muted-foreground">
          {document.merkleStatus === 'ANCHORED'
            ? 'Anchored on-chain. The public verification links the transaction.'
            : 'This document was not anchored before it left the issued state.'}
        </p>
      )}

      <Explainer
        title="How a document gets anchored"
        summary="Five steps from an issued document to a root on Polygon."
        steps={ANCHORING_STEPS}
      />
    </Card>
  )
}
