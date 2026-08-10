import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileWarning, Share2, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { Notice } from '@/components/shared/Notice'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { DetailSkeleton } from '@/components/shared/Skeletons'
import { useGetDocumentQuery } from '@/features/document/api'
import { AuthenticityCard } from '@/features/document/components/AuthenticityCard'
import { DocumentActions } from '@/features/document/components/DocumentActions'
import { DocumentProgress } from '@/features/document/components/DocumentProgress'
import { ResubmitForm } from '@/features/document/components/ResubmitForm'
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
  const { user, role, activeOrgId } = useAuth()
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
          // An org member viewing their own org's document who holds no HR persona.
          const isOrgViewerWithoutHr = activeOrgId === document.organizationId && role !== 'HR'

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

              {/* Strict role separation means an ORG_ADMIN can watch a document but not
                  move it. Saying nothing leaves them staring at a queue that never
                  drains — especially in a young org that has not appointed an HR yet. */}
              {document.status === 'PENDING_HR' && isOrgViewerWithoutHr && (
                <Notice tone="pending" title="Only an HR member can approve this" icon={UserCog}>
                  Approving requires the HR role — an admin cannot co-sign, because the second signature has to come
                  from someone other than the manager who signed. Grant someone (or yourself) the HR role in{' '}
                  <Link to="/app/members" className="focus-ring rounded font-medium text-seal hover:underline">
                    Members
                  </Link>
                  .
                </Notice>
              )}

              {isHolder && returned && <ResubmitForm document={document} />}

              <DocumentProgress document={document} />

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

              {!preIssue && (
                <AuthenticityCard document={document} onDownloadCredential={() => downloadCredential(document.id)} />
              )}
            </div>
          )
        }}
      </QueryBoundary>
    </div>
  )
}

export default HolderDocumentDetail
