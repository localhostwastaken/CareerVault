import { Anchor } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { Notice } from '@/components/shared/Notice'
import { extractContentFields } from '@/features/document/content'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'
import { VerdictBanner } from '@/features/verification/components/VerdictBanner'
import { CheckRow } from '@/features/verification/components/CheckRow'
import type { VerificationResult } from '@/features/verification/types'
import { formatDate } from '@/lib/format'

const REVOCATION_LABEL: Record<string, string> = {
  ADMINISTRATIVE_ERROR: 'Administrative error',
  POLICY_VIOLATION: 'Policy violation',
  ISSUED_IN_ERROR: 'Issued in error',
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-micro">{label}</dt>
      <dd className="tnum mt-1 text-body text-foreground">{value}</dd>
    </div>
  )
}

export function VerificationReport({ result }: { result: VerificationResult }) {
  const { document, anchor, revocation } = result
  const fields = document ? extractContentFields(document.content) : []

  return (
    <div className="flex flex-col gap-5">
      <VerdictBanner verdict={result.verdict} anchored={result.anchored} />

      {revocation && (
        <Notice
          tone="revoked"
          title={`Revoked${revocation.revokedAt ? ` on ${formatDate(revocation.revokedAt)}` : ''}`}
        >
          {revocation.reason ||
            (revocation.code ? (REVOCATION_LABEL[revocation.code] ?? revocation.code) : 'No reason provided.')}
        </Notice>
      )}

      {document && (
        <Card className="p-6">
          <p className="label-micro">Credential</p>
          <h2 className="mt-0.5 font-serif text-h1 text-foreground">{DOCUMENT_TYPE_LABEL[document.type]}</h2>
          <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-border pt-5 sm:grid-cols-2">
            <Field label="Holder" value={document.holderName} />
            <Field label="Issued by" value={document.organizationName} />
            <Field label="Issued" value={formatDate(document.issuedAt)} />
            <Field label="Expires" value={document.expiresAt ? formatDate(document.expiresAt) : 'No expiry'} />
            {fields.map((field) => (
              <Field key={field.label} label={field.label} value={field.value} />
            ))}
          </dl>
          {document.documentHash && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="label-micro mb-1.5">Document hash · SHA-256</p>
              <HashDisplay value={document.documentHash} lead={16} tail={16} label="Copy document hash" />
            </div>
          )}
        </Card>
      )}

      {result.checks.length > 0 && (
        <Card className="p-6">
          <h2 className="text-h2 text-foreground">Verification checks</h2>
          <p className="mt-0.5 text-body text-muted-foreground">
            Each step is recomputed at request time — nothing here is cached.
          </p>
          <ol className="mt-3">
            {result.checks.map((check, index) => (
              <CheckRow key={check.key} check={check} step={index + 1} />
            ))}
          </ol>
        </Card>
      )}

      {anchor && (
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Anchor className="size-4 text-anchor" />
            <h2 className="text-h2 text-foreground">On-chain anchor</h2>
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="label-micro">Merkle root</dt>
              <dd className="mt-1">
                <HashDisplay value={anchor.rootHash} lead={16} tail={16} label="Copy Merkle root" />
              </dd>
            </div>
            {anchor.txHash && (
              <div className="sm:col-span-2">
                <dt className="label-micro">Transaction</dt>
                <dd className="mt-1">
                  <HashDisplay value={anchor.txHash} lead={16} tail={16} label="Copy transaction hash" />
                </dd>
              </div>
            )}
            <Field label="Block" value={anchor.blockNumber != null ? `#${anchor.blockNumber}` : '—'} />
            <Field label="Anchored" value={formatDate(anchor.anchoredAt)} />
          </dl>
        </Card>
      )}
    </div>
  )
}
