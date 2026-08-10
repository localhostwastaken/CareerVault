import { Link } from 'react-router-dom'
import { FileText, Plus, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { FilterBar } from '@/components/shared/FilterBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { ListSkeleton } from '@/components/shared/Skeletons'
import { DocumentCard } from '@/features/document/components/DocumentCard'
import { useListDocumentsQuery } from '@/features/document/api'
import { DOCUMENT_SORTS, useDocumentFilters } from '@/features/document/useDocumentFilters'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useListFilters } from '@/hooks/useListFilters'

const HolderDocuments = () => {
  useDocumentTitle('Documents')
  const query = useListDocumentsQuery({ role: 'HOLDER' })
  const filters = useListFilters()
  const { visible, statusOptions } = useDocumentFilters({
    documents: query.data ?? [],
    search: filters.search,
    status: filters.status,
    sort: filters.sort,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Career wallet"
        title="Documents"
        description="Every document you've requested, drafted, or had issued."
        actions={
          <Button asChild>
            <Link to="/app/request">
              <Plus />
              Request document
            </Link>
          </Button>
        }
      />

      <QueryBoundary
        query={query}
        skeleton={<ListSkeleton rows={5} />}
        errorTitle="Couldn't load your documents"
        empty={
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Request your first verified document from an organisation you've worked with."
            action={
              <Button asChild>
                <Link to="/app/request">
                  <Plus />
                  Request document
                </Link>
              </Button>
            }
          />
        }
      >
        {(documents) => (
          <div className="flex flex-col gap-4">
            <FilterBar
              search={filters.search}
              onSearchChange={filters.setSearch}
              searchPlaceholder="Search by type or organisation"
              statuses={statusOptions}
              status={filters.status}
              onStatusChange={filters.setStatus}
              sortOptions={DOCUMENT_SORTS}
              sort={filters.sort}
              onSortChange={filters.setSort}
              isFiltered={filters.isFiltered}
              onClear={() => filters.clear()}
              resultCount={filters.isFiltered ? visible.length : undefined}
            />

            {visible.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No documents match"
                description={`None of your ${documents.length} documents match these filters.`}
                action={
                  <Button variant="outline" onClick={() => filters.clear()}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {visible.map((document) => (
                  <DocumentCard key={document.id} document={document} />
                ))}
              </div>
            )}
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}

export default HolderDocuments
