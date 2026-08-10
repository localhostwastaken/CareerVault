import { FileText, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { FilterBar } from '@/components/shared/FilterBar'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { ListSkeleton } from '@/components/shared/Skeletons'
import { DocumentCard } from '@/features/document/components/DocumentCard'
import { useListDocumentsQuery } from '@/features/document/api'
import { DOCUMENT_SORTS, useDocumentFilters } from '@/features/document/useDocumentFilters'
import type { AppRole } from '@/features/auth/types'
import type { DocumentStatus } from '@/features/document/types'
import { useAuth } from '@/hooks/useAuth'
import { useListFilters } from '@/hooks/useListFilters'

interface DocumentListProps {
  statuses: DocumentStatus[]
  emptyTitle: string
  emptyDescription: string
  // The persona role to scope the query to. Prevents mixing holder docs into the
  // manager inbox, manager docs into the HR queue, etc.
  role?: AppRole
  /** Hide the filter bar on short, single-purpose queues. */
  isFilterable?: boolean
}

// The shared body of every portal queue page: role-scoped, status-limited, filterable.
export function DocumentList({ statuses, emptyTitle, emptyDescription, role, isFilterable = true }: DocumentListProps) {
  const query = useListDocumentsQuery(role ? { role } : undefined)
  const filters = useListFilters()
  const { activeOrgId } = useAuth()

  // The server scopes by ROLE across every membership the user holds, which merges
  // two employers' queues into one list. The active persona is a single org, so the
  // view must be narrowed to it — otherwise a manager at two companies sees the wrong
  // inbox. HOLDER is exempt: a holder's documents span all the orgs they requested from.
  const scoped = (query.data ?? []).filter(
    (document) =>
      statuses.includes(document.status) &&
      (role === 'HOLDER' || !activeOrgId || document.organizationId === activeOrgId),
  )
  const { visible, statusOptions } = useDocumentFilters({
    documents: scoped,
    search: filters.search,
    status: filters.status,
    sort: filters.sort,
  })

  return (
    <QueryBoundary
      query={query}
      skeleton={<ListSkeleton rows={4} />}
      errorTitle="Couldn't load documents"
      isEmpty={() => scoped.length === 0}
      empty={<EmptyState icon={FileText} title={emptyTitle} description={emptyDescription} />}
    >
      {() => (
        <div className="flex flex-col gap-4">
          {/* One status group means the chips would all say the same thing. */}
          {isFilterable && (scoped.length > 4 || filters.isFiltered) && (
            <FilterBar
              search={filters.search}
              onSearchChange={filters.setSearch}
              searchPlaceholder="Search by type, person or organisation"
              statuses={statusOptions.length > 1 ? statusOptions : undefined}
              status={filters.status}
              onStatusChange={filters.setStatus}
              sortOptions={DOCUMENT_SORTS}
              sort={filters.sort}
              onSortChange={filters.setSort}
              isFiltered={filters.isFiltered}
              onClear={() => filters.clear()}
              resultCount={filters.isFiltered ? visible.length : undefined}
            />
          )}

          {visible.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nothing matches"
              description={`None of these ${scoped.length} documents match your filters.`}
              action={
                <Button variant="outline" onClick={() => filters.clear()}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {visible.map((document) => (
                <DocumentCard key={document.id} document={document} showHolder={role !== 'HOLDER'} />
              ))}
            </div>
          )}
        </div>
      )}
    </QueryBoundary>
  )
}
