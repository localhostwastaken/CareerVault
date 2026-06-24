import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useGetDocumentQuery } from '@/features/document/api'
import { SignDocumentForm } from '@/features/document/components/SignDocumentForm'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'

const ManagerSignDocument = () => {
  const { id = '' } = useParams()
  const { data: document, isLoading, isError } = useGetDocumentQuery(id, { skip: !id })

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (isError || !document) {
    return (
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
    )
  }

  const canSign = document.status === 'REQUESTED' || document.status === 'DRAFT'
  const requestNote = typeof document.contentJson.note === 'string' ? document.contentJson.note : null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/inbox">
          <ArrowLeft />
          Back to inbox
        </Link>
      </Button>
      <PageHeader
        title={`Draft & sign — ${DOCUMENT_TYPE_LABEL[document.type]}`}
        description={`For ${document.holderName} · ${document.organizationName}`}
      />

      {requestNote && (
        <Card className="bg-surface-2 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">Holder&rsquo;s note</p>
          <p className="mt-1 text-sm text-foreground">{requestNote}</p>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {canSign ? (
            <SignDocumentForm document={document} />
          ) : (
            <p className="text-sm text-muted-foreground">
              This document is {document.status.toLowerCase().replace('_', ' ')} and can no longer be signed.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ManagerSignDocument
