import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Explainer } from '@/components/shared/Explainer'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { SIGNING_STEPS } from '@/features/document/explainers'
import type { DocumentDetail } from '@/features/document/types'
import { useDocumentFraming } from '@/features/document/useDocumentFraming'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

function SignatureRow({ label, signed, by }: { label: string; signed: boolean; by: string | null }) {
  return (
    <div className="inset-well flex items-center gap-2 px-3 py-2.5">
      {signed ? (
        <CheckCircle2 className="size-4 shrink-0 text-verified" />
      ) : (
        <Circle className="size-4 shrink-0 text-subtle" />
      )}
      <div className="min-w-0">
        <span className="block text-label text-foreground">{label}</span>
        {signed && by && <span className="block truncate text-label text-muted-foreground">by {by}</span>}
      </div>
      <span className={cn('ml-auto shrink-0 text-micro', signed ? 'text-verified' : 'text-subtle')}>
        {signed ? 'Signed' : 'Pending'}
      </span>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-micro">{label}</dt>
      <dd className="tnum mt-1 text-body text-foreground">{value}</dd>
    </div>
  )
}

// The proof panel: who signed, when it was issued, and where anyone can verify it. Verification
// is by document ID on our server, so nothing cryptographic is handed out here.
export function AuthenticityCard({ document }: { document: DocumentDetail }) {
  // Same rule as DocumentPartiesSummary: signer identities are for the holder and the
  // issuing org, not for a recruiter or another neutral viewer.
  const framing = useDocumentFraming(document)
  const showNames = framing.isHolder || framing.isIssuerActor

  return (
    <Card className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-h2 text-foreground">Authenticity</h2>
        <p className="mt-1 text-body text-muted-foreground">
          Two people at {document.organizationName} signed this, each with their own sealed key. Anyone can check
          it by its document ID.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SignatureRow label="Manager signature" signed={document.hasManagerSignature} by={showNames ? document.signerName : null} />
        <SignatureRow label="HR co-signature" signed={document.hasHrSignature} by={showNames ? document.approverName : null} />
      </div>

      <dl className="grid gap-x-6 gap-y-4 border-t border-border pt-5 sm:grid-cols-2">
        <Meta label="Issued" value={formatDate(document.issuedAt)} />
        <Meta label="Expires" value={document.expiresAt ? formatDate(document.expiresAt) : 'No expiry'} />
      </dl>

      {document.hasHrSignature && (
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-5">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="label-micro">Document ID</p>
            <HashDisplay value={document.id} lead={36} tail={0} label="Copy document ID" />
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={`/verify/${document.id}`}>
              <ScanLine />
              Open public verification
            </Link>
          </Button>
        </div>
      )}

      <Explainer
        title="How these signatures were made"
        summary="From the fields the manager filled in to two personally sealed, organisation-signed attestations."
        steps={SIGNING_STEPS}
      />
    </Card>
  )
}
