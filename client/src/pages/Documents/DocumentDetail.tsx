import { Link, useNavigate, useParams } from 'react-router-dom'
import { Anchor, ArrowLeft, Download, FileJson, FileWarning, Share2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Callout } from '@/components/shared/Callout'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useGetDocumentQuery } from '@/features/document/api'
import { DocumentActions } from '@/features/document/components/DocumentActions'
import { DocumentAuthenticityCard } from '@/features/document/components/DocumentAuthenticityCard'
import { DocumentPartiesSummary } from '@/features/document/components/DocumentPartiesSummary'
import { ResubmitForm } from '@/features/document/components/ResubmitForm'
import { StatusTimeline } from '@/features/document/components/StatusTimeline'
import { extractContentFields } from '@/features/document/content'
import { useDownloadCredential, useDownloadDocument } from '@/features/document/hooks'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail as DocumentDetailType } from '@/features/document/types'
import { useDocumentFraming } from '@/features/document/useDocumentFraming'
import { formatDate } from '@/lib/format'

const PRE_ISSUE = ['REQUESTED', 'DRAFT', 'PENDING_HR']

const DocumentDetail = () => {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: document, isLoading, isError } = useGetDocumentQuery(id, { skip: !id })

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (isError || !document) {
    return (
      <EmptyState
        icon={FileWarning}
        title="Document not found"
        description="It may have been removed, or you don't have access to it."
        action={
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go back
          </Button>
        }
      />
    )
  }

  return <DocumentDetailView document={document} />
}

// Split out so useDocumentFraming (and the download hooks) run unconditionally once the
// document has loaded — the shell above handles the loading/error branches.
function DocumentDetailView({ document }: { document: DocumentDetailType }) {
  const navigate = useNavigate()
  const framing = useDocumentFraming(document)
  const downloadDocument = useDownloadDocument()
  const downloadCredential = useDownloadCredential()

  const content = document.contentJson as Record<string, unknown>
  const returned = content.returnedByManager === true
  const preIssue = PRE_ISSUE.includes(document.status)
  // credentialSubject only exists once signed; before that the content is just the request
  // note (already shown by the parties summary) — don't leak note/flags as "details".
  const fields = preIssue ? [] : extractContentFields(document.contentJson)
  // EXPIRED is stamped by the retention cron; until it runs, derive expiry from the date so
  // authenticated views agree with public verification.
  const expired =
    (document.status === 'ISSUED' || document.status === 'ANCHORED') &&
    document.expiresAt != null &&
    new Date(document.expiresAt).getTime() < Date.now()

  const description =
    framing.emphasize === 'issuer'
      ? `${preIssue ? 'Requested from' : 'Issued by'} ${document.organizationName}`
      : `For ${document.holderName}`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft />
        Back
      </Button>

      <PageHeader
        title={DOCUMENT_TYPE_LABEL[document.type]}
        description={description}
        actions={
          <>
            {framing.isHolder && (document.status === 'ISSUED' || document.status === 'ANCHORED') && (
              <Button asChild variant="secondary">
                <Link to={`/app/share-links?doc=${document.id}`}>
                  <Share2 />
                  Share
                </Link>
              </Button>
            )}
            {document.documentHash && (
              <Button variant="secondary" onClick={() => downloadCredential(document.id)}>
                <FileJson />
                Proof (JSON-LD)
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

      <DocumentPartiesSummary document={document} />

      <DocumentActions document={document} />

      {returned && (
        <Callout variant="warning" title="Returned for revision">
          {(typeof content.note === 'string' && content.note) || 'The manager returned this request. Please review and resubmit.'}
        </Callout>
      )}
      {framing.isHolder && returned && <ResubmitForm document={document} />}

      {document.status === 'REVOKED' && (
        <Callout variant="danger" title={`Revoked on ${formatDate(document.revokedAt)}`}>
          {document.revocationReasonText || document.revocationReasonCode || 'No reason provided.'}
        </Callout>
      )}
      {expired && (
        <Callout variant="warning" title={`Expired on ${formatDate(document.expiresAt)}`}>
          This document is past its validity period. Public verification will report it as expired.
        </Callout>
      )}

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

      {!preIssue && (
        <DocumentAuthenticityCard document={document} showNames={framing.isHolder || framing.isIssuerActor} />
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
    </div>
  )
}

export default DocumentDetail
