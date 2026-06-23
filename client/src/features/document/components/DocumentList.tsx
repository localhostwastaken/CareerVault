import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { DocumentCard } from '@/features/document/components/DocumentCard'
import { useListDocumentsQuery } from '@/features/document/api'
import type { AppRole } from '@/features/auth/types'
import type { DocumentStatus } from '@/features/document/types'

interface DocumentListProps {
  statuses: DocumentStatus[]
  emptyTitle: string
  emptyDescription: string
  // The persona role to scope the query to. Prevents mixing holder docs into
  // manager inbox, manager docs into HR queue, etc.
  role?: AppRole
}

// Filters the role-scoped document list down to a set of statuses — the shared
// body of every portal's queue page. Pass `role` to scope to a specific persona.
export function DocumentList({ statuses, emptyTitle, emptyDescription, role }: DocumentListProps) {
  const { data, isLoading } = useListDocumentsQuery(role ? { role } : undefined)
  const documents = (data ?? []).filter((document) => statuses.includes(document.status))

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (documents.length === 0) {
    return <EmptyState icon={FileText} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="space-y-3">
      {documents.map((document) => (
        <DocumentCard key={document.id} document={document} />
      ))}
    </div>
  )
}
