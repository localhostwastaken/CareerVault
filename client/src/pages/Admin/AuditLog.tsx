import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { TableSkeleton } from '@/components/shared/Skeletons'
import { AuditTable } from '@/features/audit/components/AuditTable'
import { useListAuditLogsQuery } from '@/features/audit/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useListFilters } from '@/hooks/useListFilters'

const PAGE_SIZE = 20

const AdminAuditLog = () => {
  useDocumentTitle('Audit log')
  // Filters live in the URL so a compliance reviewer can share the exact view they
  // are looking at. `status` carries the actor-type facet on this screen.
  const filters = useListFilters()
  const page = Math.max(1, Number(filters.param('page', '1')))
  const retentionTier = filters.param('tier')
  // Every handler that also changes a filter must reset the page in the SAME update —
  // two setSearchParams calls in one handler drop each other's changes.
  const goToPage = (next: number) => filters.update({ page: next > 1 ? String(next) : null })

  const query = useListAuditLogsQuery({
    page,
    limit: PAGE_SIZE,
    ...(filters.search ? { action: filters.search } : {}),
    ...(filters.status ? { actorType: filters.status } : {}),
    ...(retentionTier ? { retentionTier } : {}),
  })

  const total = query.data?.meta.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Admin console"
        title="Audit log"
        description="Every security and compliance event in your organisation, in your local time."
      />

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Input
          placeholder="Filter by action…"
          aria-label="Filter by action"
          value={filters.search}
          onChange={(event) => filters.update({ q: event.target.value, page: null })}
          className="w-full sm:w-56"
        />
        <SelectNative
          aria-label="Filter by actor"
          value={filters.status}
          onChange={(event) => filters.update({ status: event.target.value, page: null })}
          className="w-auto min-w-36"
        >
          <option value="">All actors</option>
          <option value="USER">User</option>
          <option value="SYSTEM">System</option>
          <option value="CRON">Scheduler</option>
        </SelectNative>
        <SelectNative
          aria-label="Filter by retention tier"
          value={retentionTier}
          onChange={(event) => filters.update({ tier: event.target.value, page: null })}
          className="w-auto min-w-40"
        >
          <option value="">All tiers</option>
          <option value="COMPLIANCE">Compliance (7 yr)</option>
          <option value="STANDARD">Standard (90 d)</option>
        </SelectNative>
        {(filters.isFiltered || retentionTier) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => filters.clear(['tier', 'page'])}
          >
            Clear filters
          </Button>
        )}
      </Card>

      <QueryBoundary
        query={query}
        skeleton={<TableSkeleton rows={8} columns={6} />}
        errorTitle="Couldn't load the audit log"
        isEmpty={(data) => data.logs.length === 0}
        empty={
          <EmptyState
            icon={ShieldCheck}
            title={filters.isFiltered ? 'No events match' : 'No audit events yet'}
            description={
              filters.isFiltered
                ? 'Try a broader filter — action names are matched exactly.'
                : 'Events appear here as people act in your organisation.'
            }
            action={
              filters.isFiltered ? (
                <Button variant="outline" onClick={() => filters.clear(['tier', 'page'])}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        }
      >
        {(data) => (
          <Card className="overflow-hidden p-0">
            <AuditTable logs={data.logs} />
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                <p className="tnum text-label text-muted-foreground">
                  {total} events · page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </QueryBoundary>
    </div>
  )
}

export default AdminAuditLog
