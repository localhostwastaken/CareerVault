import { HashDisplay } from '@/components/shared/HashDisplay'
import { extractContentFields } from '@/features/document/content'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'
import type { VerificationDocument } from '@/features/verification/types'
import { formatDate } from '@/lib/format'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="label-micro">{label}</dt>
      <dd className="tnum break-words text-body text-foreground">{value}</dd>
    </div>
  )
}

// A record excerpt beside the evidence: what was checked, not the result of checking.
// Open rather than boxed, so the evidence panel stays the dominant object.
export function CredentialRail({ document }: { document: VerificationDocument }) {
  const fields = extractContentFields(document.content)

  return (
    <section aria-labelledby="credential-heading" className="flex flex-col gap-5 border-t-2 border-rule-strong pt-4">
      <div>
        <p className="label-micro">Credential</p>
        <h2 id="credential-heading" className="mt-0.5 font-serif text-h1 text-foreground">
          {DOCUMENT_TYPE_LABEL[document.type]}
        </h2>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Field label="Holder" value={document.holderName} />
        <Field label="Issued by" value={document.organizationName} />
        <Field label="Issued" value={formatDate(document.issuedAt)} />
        <Field label="Expires" value={document.expiresAt ? formatDate(document.expiresAt) : 'No expiry'} />
      </dl>
      {fields.length > 0 && (
        <dl className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-1">
          {fields.map((field) => (
            <Field key={field.label} label={field.label} value={field.value} />
          ))}
        </dl>
      )}
      {document.documentHash && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-4">
          <p className="label-micro">Document hash · SHA-256</p>
          <HashDisplay value={document.documentHash} lead={10} tail={10} label="Copy document hash" />
        </div>
      )}
    </section>
  )
}
