import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { SuccessPanel } from '@/components/shared/SuccessPanel'
import { RequestDocumentForm } from '@/features/document/components/RequestDocumentForm'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail } from '@/features/document/types'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const HolderRequestDocument = () => {
  useDocumentTitle('Request a document')
  const navigate = useNavigate()
  const [sent, setSent] = useState<DocumentDetail | null>(null)

  // Act III: a toast disappears in four seconds and leaves the user staring at the
  // form they just submitted, unsure whether it went through.
  if (sent) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <SuccessPanel
          title="Request sent"
          description={`${sent.organizationName} has been notified. You'll get a notification when a manager signs it.`}
          summary={[
            { label: 'Document', value: DOCUMENT_TYPE_LABEL[sent.type] },
            { label: 'Organisation', value: sent.organizationName },
            { label: 'Next step', value: 'Manager review' },
          ]}
          actions={
            <>
              <Button asChild>
                <Link to={`/app/documents/${sent.id}`}>
                  Track this request
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setSent(null)}>
                Request another
              </Button>
            </>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={() => navigate(-1)}>
        <ArrowLeft />
        Back
      </Button>
      <PageHeader
        eyebrow="Career wallet"
        title="Request a document"
        description="Ask a verified organisation to issue you a tamper-evident document."
      />
      <Card className="p-6">
        <RequestDocumentForm onSent={setSent} />
      </Card>
    </div>
  )
}

export default HolderRequestDocument
