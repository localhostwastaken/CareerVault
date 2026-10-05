import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, FileCheck2, FileJson } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Explainer } from '@/components/shared/Explainer'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { PROOF_FILE_STEPS, SIGNING_STEPS } from '@/features/document/explainers'
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

// The proof panel: who signed, when it was issued, and the hash a verifier can check.
// This used to be rendered twice on the detail page — once conditionally and once
// unconditionally — so post-issuance documents showed two identical cards.
interface AuthenticityCardProps {
  document: DocumentDetail
  /** Downloads the JSON-LD credential. Omit to hide the action. */
  onDownloadCredential?: () => void
}

export function AuthenticityCard({ document, onDownloadCredential }: AuthenticityCardProps) {
  // Same rule as DocumentPartiesSummary: signer identities are for the holder and the
  // issuing org, not for a recruiter or another neutral viewer.
  const framing = useDocumentFraming(document)
  const showNames = framing.isHolder || framing.isIssuerActor

  return (
    <Card className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-h2 text-foreground">Authenticity</h2>
        <p className="mt-1 text-body text-muted-foreground">
          Two people at {document.organizationName} signed this, and the hash below is what a verifier checks it
          against.
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

      {document.documentHash && (
        <div className="flex flex-col gap-4 border-t border-border pt-5">
          <div>
            <p className="label-micro mb-2">Document hash · SHA-256</p>
            <HashDisplay value={document.documentHash} lead={12} tail={12} label="Copy document hash" />
          </div>

          {/* Was a bare "Proof" button in the page header, where nobody could tell what
              it produced. Here it sits beside the hash it contains, and says so. */}
          {onDownloadCredential && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-md text-label text-muted-foreground">
                Need to prove this offline? Download the signed proof file. It bundles the hash, both signatures and
                the on-chain receipt, so a verifier can check it without CareerVault.
              </p>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={onDownloadCredential}>
                  <FileJson />
                  Download proof file
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/verify/file">
                    <FileCheck2 />
                    Check a proof file
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Explainer
          title="How these signatures were made"
          summary="From the fields the manager filled in to two RS256 signatures, sealed at rest."
          steps={SIGNING_STEPS}
        />
        {onDownloadCredential && (
          <Explainer
            title="How the proof file is checked"
            summary="The same checks run in your browser, in the command-line tool, or by anyone with the file."
            steps={PROOF_FILE_STEPS}
          />
        )}
      </div>
    </Card>
  )
}
