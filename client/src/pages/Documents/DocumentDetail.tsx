import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { DocumentPartiesSummary } from '@/features/document/components/DocumentPartiesSummary'
import { DocumentProgress } from '@/features/document/components/DocumentProgress'
import { ResubmitForm } from '@/features/document/components/ResubmitForm'
import { extractContentFields } from '@/features/document/content'
import { useDownloadCredential, useDownloadDocument } from '@/features/document/hooks'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail as DocumentDetailType } from '@/features/document/types'
import { useDocumentFraming } from '@/features/document/useDocumentFraming'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDate } from '@/lib/format'

const PRE_ISSUE = ['REQUESTED', 'DRAFT', 'PENDING_HR']

const DocumentDetail = () => {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const query = useGetDocumentQuery(id, { skip: !id })

  useDocumentTitle(query.data ? DOCUMENT_TYPE_LABEL[query.data.type] : 'Document')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Every persona reaches this page from a different queue (wallet, inbox,
          approvals), so history is the only correct destination — a fixed link to
          /app/documents would bounce a manager off its holder-only RoleGate. */}
      <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={() => navigate(-1)}>
        <ArrowLeft />
        Back
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
              <Button variant="secondary" onClick={() => navigate(-1)}>
                Go back
              </Button>
            }
          />
        }
        isEmpty={(document) => !document}
      >
        {(document) => <DocumentDetailView document={document} />}
      </QueryBoundary>
    </div>
  )
}

// Split out so useDocumentFraming and the download hooks run unconditionally — inside
// the boundary's render prop they would be conditional hooks of QueryBoundary itself.
function DocumentDetailView({ document }: { document: DocumentDetailType }) {
  const framing = useDocumentFraming(document)
  const { role, activeOrgId } = useAuth()
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
  // An org member watching their own org's document who holds no HR persona.
  const isOrgViewerWithoutHr = activeOrgId === document.organizationId && role !== 'HR'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={framing.emphasize === 'issuer' ? (preIssue ? 'Requested from' : 'Issued by') : 'Document for'}
        title={DOCUMENT_TYPE_LABEL[document.type]}
        description={framing.emphasize === 'issuer' ? document.organizationName : document.holderName}
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
        <Notice tone="pending" title="Returned for revision" icon={FileWarning}>
          {(typeof content.note === 'string' && content.note) || 'The manager returned this request. Review and resubmit.'}
        </Notice>
      )}

      {document.status === 'REVOKED' && (
        <Notice tone="revoked" title={`Revoked on ${formatDate(document.revokedAt)}`}>
          {document.revocationReasonText || document.revocationReasonCode || 'No reason provided.'}
        </Notice>
      )}

      {expired && (
        <Notice tone="pending" title={`Expired on ${formatDate(document.expiresAt)}`}>
          This document is past its validity period. Public verification will report it as expired.
        </Notice>
      )}

      {/* Strict role separation means an ORG_ADMIN can watch a document but not move
          it. Saying nothing leaves them staring at a queue that never drains —
          especially in a young org that has not appointed an HR yet. */}
      {document.status === 'PENDING_HR' && isOrgViewerWithoutHr && (
        <Notice tone="pending" title="Only an HR member can approve this" icon={UserCog}>
          Approving requires the HR role — an admin cannot co-sign, because the second signature has to come from
          someone other than the manager who signed. Grant someone (or yourself) the HR role in{' '}
          <Link to="/app/members" className="focus-ring rounded font-medium text-seal hover:underline">
            Members
          </Link>
          .
        </Notice>
      )}

      {framing.isHolder && returned && <ResubmitForm document={document} />}

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
}

export default DocumentDetail
