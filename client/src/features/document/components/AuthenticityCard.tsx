import { CheckCircle2, Circle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { HashDisplay } from '@/components/shared/HashDisplay'
import type { DocumentDetail } from '@/features/document/types'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

function SignatureRow({ label, signed }: { label: string; signed: boolean }) {
  return (
    <div className="inset-well flex items-center gap-2 px-3 py-2.5">
      {signed ? (
        <CheckCircle2 className="size-4 shrink-0 text-verified" />
      ) : (
        <Circle className="size-4 shrink-0 text-subtle" />
      )}
      <span className="text-label text-foreground">{label}</span>
      <span className={cn('ml-auto text-micro', signed ? 'text-verified' : 'text-subtle')}>
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
export function AuthenticityCard({ document }: { document: DocumentDetail }) {
  return (
    <Card className="flex flex-col gap-6 p-6">
      <h2 className="text-h2 text-foreground">Authenticity</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <SignatureRow label="Manager signature" signed={document.hasManagerSignature} />
        <SignatureRow label="HR co-signature" signed={document.hasHrSignature} />
      </div>

      <dl className="grid gap-x-6 gap-y-4 border-t border-border pt-5 sm:grid-cols-2">
        <Meta label="Issued" value={formatDate(document.issuedAt)} />
        <Meta label="Expires" value={document.expiresAt ? formatDate(document.expiresAt) : 'No expiry'} />
      </dl>

      {document.documentHash && (
        <div className="border-t border-border pt-5">
          <p className="label-micro mb-2">Document hash · SHA-256</p>
          <HashDisplay value={document.documentHash} lead={12} tail={12} label="Copy document hash" />
        </div>
      )}
    </Card>
  )
}
