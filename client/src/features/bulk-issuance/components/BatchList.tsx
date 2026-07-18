import { FileSpreadsheet } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'
import { formatDateTime } from '@/lib/format'
import { useListBulkBatchesQuery } from '../api'
import { BatchStatusBadge } from './BatchStatusBadge'

export function BatchList({ organizationId }: { organizationId: string }) {
  // Batches finish within seconds for demo-sized CSVs - poll while the page is open rather than building a smarter "only while PROCESSING" refetch strategy.
  const { data, isLoading } = useListBulkBatchesQuery({ organizationId }, { pollingInterval: 4000 })
  const batches = data ?? []

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (batches.length === 0) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="No batches yet"
        description="Upload a CSV above to issue experience letters or salary proofs in bulk."
      />
    )
  }

  const latest = batches[0]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Latest batch — total rows" value={latest.totalRows} />
        <StatCard label="Processed" value={latest.processedRows} />
        <StatCard label="Errors" value={latest.errorRows} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Started</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell>{formatDateTime(batch.startedAt)}</TableCell>
              <TableCell>{DOCUMENT_TYPE_LABEL[batch.documentType]}</TableCell>
              <TableCell>
                <BatchStatusBadge status={batch.status} />
              </TableCell>
              <TableCell className="tnum">
                {batch.processedRows}/{batch.totalRows}
                {batch.errorRows > 0 && <span className="text-revoked"> ({batch.errorRows} errors)</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
