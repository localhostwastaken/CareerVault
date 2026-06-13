import { Link, useParams } from 'react-router-dom'
import { Anchor, ArrowLeft, CheckCircle2, Circle, Download, FileWarning, Share2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useGetDocumentQuery } from '@/features/document/api'
import { DocumentActions } from '@/features/document/components/DocumentActions'
import { StatusTimeline } from '@/features/document/components/StatusTimeline'
import { extractContentFields } from '@/features/document/content'
import { useDownloadDocument } from '@/features/document/hooks'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/format'

const PRE_ISSUE = ['REQUESTED', 'DRAFT', 'PENDING_HR']

const HolderDocumentDetail = () => {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { data: document, isLoading, isError } = useGetDocumentQuery(id, { skip: !id })
  const downloadDocument = useDownloadDocument()

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (isError || !document) {
    return (
      <EmptyState
        icon={FileWarning}
        title="Document not found"
        description="It may have been removed, or you don't have access to it."
        action={
          <Button asChild variant="secondary">
            <Link to="/app/documents">Back to documents</Link>
          </Button>
        }
      />
    )
  }

  const fields = extractContentFields(document.contentJson)
  const requestedFrom = PRE_ISSUE.includes(document.status)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/documents">
          <ArrowLeft />
          Back to documents
        </Link>
      </Button>

      <PageHeader
        title={DOCUMENT_TYPE_LABEL[document.type]}
        description={`${requestedFrom ? 'Requested from' : 'Issued by'} ${document.organizationName}`}
        actions={
          <>
            {user?.id === document.holderId &&
              (document.status === 'ISSUED' || document.status === 'ANCHORED') && (
                <Button asChild variant="secondary">
                  <Link to={`/app/share-links?doc=${document.id}`}>
                    <Share2 />
                    Share
                  </Link>
                </Button>
              )}
            {document.renderedPdfUrl && (
              <Button onClick={() => downloadDocument(document.id)}>
                <Download />
                Download PDF
              </Button>
            )}
          </>
        }
      />

      <DocumentActions document={document} />

      <Card className="space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={document.status} />
          {document.merkleStatus === 'ANCHORED' && (
            <Badge variant="anchor">
              <Anchor />
              On-chain
            </Badge>
          )}
          {document.merkleStatus === 'PENDING_BATCH' && (
            <Badge variant="pending">
              <Anchor />
              Awaiting anchor
            </Badge>
          )}
          <span className="ml-auto text-xs text-subtle">Version {document.version}</span>
        </div>

        <StatusTimeline status={document.status} />
      </Card>

      {document.status === 'REVOKED' && (
        <Card className="border-revoked/30 bg-revoked-soft/40 p-5">
          <div className="flex items-start gap-3">
            <FileWarning className="mt-0.5 size-5 shrink-0 text-revoked" />
            <div>
              <p className="text-sm font-semibold text-revoked">Revoked on {formatDate(document.revokedAt)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {document.revocationReasonText || document.revocationReasonCode || 'No reason provided.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {fields.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Document details</h2>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-subtle">{field.label}</dt>
                <dd className="mt-1 text-sm text-foreground">{field.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <Card className="space-y-4 p-6">
        <h2 className="text-sm font-semibold text-foreground">Authenticity</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <SignatureRow label="Manager signature" signed={document.hasManagerSignature} />
          <SignatureRow label="HR co-signature" signed={document.hasHrSignature} />
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
    </div>
  )
}

function SignatureRow({ label, signed }: { label: string; signed: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
      {signed ? (
        <CheckCircle2 className="size-4 text-verified" />
      ) : (
        <Circle className="size-4 text-subtle" />
      )}
      <span className="text-sm text-foreground">{label}</span>
      <span className={`ml-auto text-xs font-medium ${signed ? 'text-verified' : 'text-subtle'}`}>
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

export default HolderDocumentDetail
