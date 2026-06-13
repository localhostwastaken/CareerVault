import { Anchor, ShieldOff } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { HashDisplay } from '@/components/shared/HashDisplay'
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

export function VerificationReport({ result }: { result: VerificationResult }) {
  const { document, anchor, revocation } = result
  const fields = document ? extractContentFields(document.content) : []

  return (
    <div className="space-y-6">
      <VerdictBanner verdict={result.verdict} anchored={result.anchored} />

      {revocation && (
        <Card className="border-revoked/30 bg-revoked-soft/40 p-5">
          <div className="flex items-start gap-3">
            <ShieldOff className="mt-0.5 size-5 shrink-0 text-revoked" />
            <div>
              <p className="text-sm font-semibold text-revoked">
                Revoked{revocation.revokedAt ? ` on ${formatDate(revocation.revokedAt)}` : ''}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {revocation.reason ||
                  (revocation.code ? REVOCATION_LABEL[revocation.code] ?? revocation.code : 'No reason provided.')}
              </p>
            </div>
          </div>
        </Card>
      )}

      {document && (
        <Card className="space-y-5 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">Credential</p>
            <h3 className="mt-0.5 text-lg font-semibold text-foreground">{DOCUMENT_TYPE_LABEL[document.type]}</h3>
          </div>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label="Holder" value={document.holderName} />
            <Field label="Issued by" value={document.organizationName} />
            <Field label="Issued" value={formatDate(document.issuedAt)} />
            <Field label="Expires" value={document.expiresAt ? formatDate(document.expiresAt) : 'No expiry'} />
            {fields.map((field) => (
              <Field key={field.label} label={field.label} value={field.value} />
            ))}
          </dl>
          {document.documentHash && (
            <div className="border-t border-border pt-4">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-subtle">Document hash</p>
              <HashDisplay value={document.documentHash} lead={12} tail={12} />
            </div>
          )}
        </Card>
      )}

      {result.checks.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Verification checks</h3>
          <ol>
            {result.checks.map((check, index) => (
              <CheckRow key={check.key} check={check} step={index + 1} />
            ))}
          </ol>
        </Card>
      )}

      {anchor && (
        <Card className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Anchor className="size-4 text-anchor" />
            <h3 className="text-sm font-semibold text-foreground">On-chain anchor</h3>
          </div>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-subtle">Merkle root</dt>
              <dd className="mt-1">
                <HashDisplay value={anchor.rootHash} lead={12} tail={12} />
              </dd>
            </div>
            {anchor.txHash && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-subtle">Transaction</dt>
                <dd className="mt-1">
                  <HashDisplay value={anchor.txHash} lead={12} tail={12} />
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="tnum mt-1 text-sm text-foreground">{value}</dd>
    </div>
  )
}
