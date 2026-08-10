import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { Notice } from '@/components/shared/Notice'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { DetailSkeleton } from '@/components/shared/Skeletons'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useGetDocumentQuery } from '@/features/document/api'
import { SignDocumentForm } from '@/features/document/components/SignDocumentForm'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const ManagerSignDocument = () => {
  const { id = '' } = useParams()
  const query = useGetDocumentQuery(id, { skip: !id })
  useDocumentTitle(query.data ? `Sign — ${DOCUMENT_TYPE_LABEL[query.data.type]}` : 'Sign document')

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link to="/app/inbox">
          <ArrowLeft />
          Back to inbox
        </Link>
      </Button>

      <QueryBoundary
        query={query}
        skeleton={<DetailSkeleton />}
        errorTitle="Couldn't load this request"
        isEmpty={(document) => !document}
        empty={
          <EmptyState
            icon={FileWarning}
            title="Document not found"
            description="It may have been removed, or you don't have access to it."
            action={
              <Button asChild variant="secondary">
                <Link to="/app/inbox">Back to inbox</Link>
              </Button>
            }
          />
        }
      >
        {(document) => {
          const canSign = document.status === 'REQUESTED' || document.status === 'DRAFT'
          const note = typeof document.contentJson.note === 'string' ? document.contentJson.note : null

          return (
            <div className="flex flex-col gap-6">
              <PageHeader
                eyebrow={`Draft & sign · ${document.organizationName}`}
                title={DOCUMENT_TYPE_LABEL[document.type]}
                description={`For ${document.holderName} · ${document.holderEmail}`}
                actions={<StatusBadge status={document.status} />}
              />

              {note && (
                <div className="inset-well p-4">
                  <p className="label-micro">What the holder asked for</p>
                  <p className="mt-1.5 text-body text-foreground">{note}</p>
                </div>
              )}

              {canSign ? (
                <Card className="p-6">
                  <SignDocumentForm document={document} />
                </Card>
              ) : (
                <Notice tone="neutral" title="This document can no longer be signed">
                  It is {document.status.toLowerCase().replace('_', ' ')}. Signing only applies to requested or draft
                  documents.
                </Notice>
              )}
            </div>
          )
        }}
      </QueryBoundary>
    </div>
  )
}

export default ManagerSignDocument
