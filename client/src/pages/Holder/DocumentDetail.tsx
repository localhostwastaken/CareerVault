import { Link, useParams } from 'react-router-dom'
import { Anchor, ArrowLeft, Download, FileJson, FileWarning, Share2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { Notice } from '@/components/shared/Notice'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { DetailSkeleton } from '@/components/shared/Skeletons'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useGetDocumentQuery } from '@/features/document/api'
import { AuthenticityCard } from '@/features/document/components/AuthenticityCard'
import { DocumentActions } from '@/features/document/components/DocumentActions'
import { ResubmitForm } from '@/features/document/components/ResubmitForm'
import { StatusTimeline } from '@/features/document/components/StatusTimeline'
import { extractContentFields } from '@/features/document/content'
import { useDownloadCredential, useDownloadDocument } from '@/features/document/hooks'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail } from '@/features/document/types'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDate } from '@/lib/format'

const PRE_ISSUE = ['REQUESTED', 'DRAFT', 'PENDING_HR']

function wasReturned(document: DocumentDetail): boolean {
  return (document.contentJson as Record<string, unknown>).returnedByManager === true
}

function returnNote(document: DocumentDetail): string {
  const note = (document.contentJson as Record<string, unknown>).note
  return typeof note === 'string' && note ? note : 'The manager returned this request. Review and resubmit.'
}

const HolderDocumentDetail = () => {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const query = useGetDocumentQuery(id, { skip: !id })
  const downloadDocument = useDownloadDocument()
  const downloadCredential = useDownloadCredential()

  useDocumentTitle(query.data ? DOCUMENT_TYPE_LABEL[query.data.type] : 'Document')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link to="/app/documents">
          <ArrowLeft />
          Back to documents
        </Link>
      </Button>

      <QueryBoundary
        query={query}
        skeleton={<DetailSkeleton />}
        errorTitle="Couldn't load this document"
        // The PageHeader h1 lives in the success branch, so on these two paths the
        // state component is the page's only heading.
        headingLevel={1}
        empty={
          <EmptyState
            icon={FileWarning}
            headingLevel={1}
            title="Document not found"
            description="It may have been removed, or you don't have access to it."
            action={
              <Button asChild variant="secondary">
                <Link to="/app/documents">Back to documents</Link>
              </Button>
            }
          />
        }
        isEmpty={(document) => !document}
      >
        {(document) => {
          const fields = extractContentFields(document.contentJson)
          const preIssue = PRE_ISSUE.includes(document.status)
          const isHolder = user?.id === document.holderId
          const returned = wasReturned(document)

          return (
            <div className="flex flex-col gap-6">
              <PageHeader
                eyebrow={preIssue ? 'Requested from' : 'Issued by'}
                title={DOCUMENT_TYPE_LABEL[document.type]}
                description={document.organizationName}
                actions={
                  <>
                    {isHolder && (document.status === 'ISSUED' || document.status === 'ANCHORED') && (
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
                        Proof
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

              {returned && (
                <Notice tone="pending" title="Returned for revision" icon={FileWarning}>
                  {returnNote(document)}
                </Notice>
              )}

              {document.status === 'REVOKED' && (
                <Notice tone="revoked" title={`Revoked on ${formatDate(document.revokedAt)}`}>
                  {document.revocationReasonText || document.revocationReasonCode || 'No reason provided.'}
                </Notice>
              )}

              {isHolder && returned && <ResubmitForm document={document} />}

              <Card className="flex flex-col gap-6 p-6">
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
                  <span className="tnum ml-auto text-micro text-subtle">Version {document.version}</span>
                </div>
                <StatusTimeline status={document.status} />
              </Card>

              {fields.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-h2 text-foreground">Document details</h2>
                  <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    {fields.map((field) => (
                      <div key={field.label}>
                        <dt className="label-micro">{field.label}</dt>
                        <dd className="mt-1 text-body text-foreground">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              )}

              {!preIssue && <AuthenticityCard document={document} />}
            </div>
          )
        }}
      </QueryBoundary>
    </div>
  )
}

export default HolderDocumentDetail
