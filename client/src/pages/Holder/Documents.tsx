import { Link } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { DocumentCard } from '@/features/document/components/DocumentCard'
import { useListDocumentsQuery } from '@/features/document/api'

const HolderDocuments = () => {
  const { data, isLoading } = useListDocumentsQuery({ role: 'HOLDER' })
  const documents = data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Every document you've requested, drafted, or had issued."
        actions={
          <Button asChild>
            <Link to="/app/request">
              <Plus />
              Request
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Request your first verified document to get started."
          action={
            <Button asChild>
              <Link to="/app/request">
                <Plus />
                Request document
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  )
}

export default HolderDocuments
