import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileWarning, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Callout } from '@/components/shared/Callout'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useGetDocumentQuery } from '@/features/document/api'
import { DocumentPartiesSummary } from '@/features/document/components/DocumentPartiesSummary'
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
        description={`For ${document.holderName}`}
      />

      <DocumentPartiesSummary document={document} />

      {canSign ? (
        <>
          <Callout variant="info" title="You're attesting to this record" icon={ShieldCheck}>
            By signing, you confirm — on behalf of {document.organizationName} — that the details below are true about{' '}
            {document.holderName}. Your signature is cryptographically bound to this content and sent to HR for approval.
          </Callout>
          <Card>
            <CardContent className="pt-6">
              <SignDocumentForm document={document} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              This document is {document.status.toLowerCase().replace('_', ' ')} and can no longer be signed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ManagerSignDocument
