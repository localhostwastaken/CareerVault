import { CheckCircle2, XCircle } from 'lucide-react'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { extractContentFields } from '@/features/document/content'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'
import type { VerificationResult } from '@/features/verification/types'
import { formatDate } from '@/lib/format'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="label-micro">{label}</dt>
      <dd className="tnum break-words text-body text-foreground">{value}</dd>
    </div>
  )
}

const ROLE_LABEL = { MANAGER: 'Signed by', HR: 'Co-signed by' } as const

// A record excerpt beside the evidence: what was checked, not the result of checking.
// Open rather than boxed, so the evidence panel stays the dominant object.
export function CredentialRail({ result }: { result: VerificationResult }) {
  const { document, issuer } = result
  if (!document) return null
  const fields = extractContentFields(document.fields)

  return (
    <section aria-labelledby="credential-heading" className="flex flex-col gap-5 border-t-2 border-rule-strong pt-4">
      <div>
        <p className="label-micro">Credential</p>
        <h2 id="credential-heading" className="mt-0.5 font-serif text-h1 text-foreground">
          {DOCUMENT_TYPE_LABEL[document.type]}
        </h2>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Field label="Holder" value={document.holderName ?? 'Withheld on a public lookup'} />
        <Field label="Issued by" value={issuer ? `${issuer.name} (${issuer.domain})` : '—'} />
        <Field label="Issued" value={formatDate(result.issuedAt)} />
        <Field label="Expires" value={result.expiresAt ? formatDate(result.expiresAt) : 'No expiry'} />
      </dl>
      {result.roleSignatures.length > 0 && (
        <ul className="flex flex-col gap-2 border-t border-border pt-4">
          {result.roleSignatures.map((signature) => (
            <li key={signature.role} className="flex items-center gap-2 text-body">
              {signature.isValid ? (
                <CheckCircle2 className="size-4 shrink-0 text-verified" aria-hidden />
              ) : (
                <XCircle className="size-4 shrink-0 text-revoked" aria-hidden />
              )}
              <span className="text-muted-foreground">{ROLE_LABEL[signature.role]}</span>
              <span className="min-w-0 truncate text-foreground">{signature.signerName ?? '—'}</span>
              <span className="sr-only">{signature.isValid ? 'valid' : 'invalid'}</span>
            </li>
          ))}
        </ul>
      )}
      {fields.length > 0 && (
        <dl className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-1">
          {fields.map((field) => (
            <Field key={field.label} label={field.label} value={field.value} />
          ))}
        </dl>
      )}
      <div className="flex flex-col gap-1.5 border-t border-border pt-4">
        <p className="label-micro">Document ID</p>
        <HashDisplay value={document.documentId} lead={36} tail={0} label="Copy document ID" />
      </div>
    </section>
  )
}
