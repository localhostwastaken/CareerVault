import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { RequestDocumentForm } from '@/features/document/components/RequestDocumentForm'

const HolderRequestDocument = () => {
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft />
        Back
      </Button>
      <PageHeader
        title="Request a document"
        description="Ask a verified organization to issue you a tamper-evident document."
      />
      <Card>
        <CardContent className="pt-6">
          <RequestDocumentForm />
        </CardContent>
      </Card>
    </div>
  )
}

export default HolderRequestDocument
