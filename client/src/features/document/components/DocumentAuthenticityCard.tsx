import { CheckCircle2, Circle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { formatDate } from '@/lib/format'
import type { DocumentDetail } from '@/features/document/types'

// The cryptographic authenticity panel: who signed, who co-signed, validity dates,
// and the SHA-256 content hash. Names are hidden for neutral viewers (e.g. recruiters).
export function DocumentAuthenticityCard({
  document,
  showNames = true,
}: {
  document: DocumentDetail
  showNames?: boolean
}) {
  return (
    <Card className="space-y-4 p-6">
      <h2 className="text-sm font-semibold text-foreground">Authenticity</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <SignatureRow label="Manager signature" signed={document.hasManagerSignature} by={showNames ? document.signerName : null} />
        <SignatureRow label="HR co-signature" signed={document.hasHrSignature} by={showNames ? document.approverName : null} />
      </div>
      <dl className="grid gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-2">
        <Meta label="Issued" value={formatDate(document.issuedAt)} />
        <Meta label="Expires" value={document.expiresAt ? formatDate(document.expiresAt) : 'No expiry'} />
      </dl>
      {document.documentHash && (
        <div className="border-t border-border pt-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-subtle">Document hash (SHA-256)</p>
          <HashDisplay value={document.documentHash} lead={10} tail={10} />
        </div>
      )}
    </Card>
  )
}

function SignatureRow({ label, signed, by }: { label: string; signed: boolean; by?: string | null }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
      {signed ? <CheckCircle2 className="size-4 shrink-0 text-verified" /> : <Circle className="size-4 shrink-0 text-subtle" />}
      <div className="min-w-0">
        <span className="block truncate text-sm text-foreground">{label}</span>
        {signed && by && <span className="block truncate text-xs text-muted-foreground">by {by}</span>}
      </div>
      <span className={`ml-auto shrink-0 text-xs font-medium ${signed ? 'text-verified' : 'text-subtle'}`}>
        {signed ? 'Signed' : 'Pending'}
      </span>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="tnum mt-1 text-sm text-foreground">{value}</dd>
    </div>
  )
}
