import { FileSpreadsheet } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { Section } from '@/components/shared/Section'
import { TableSkeleton } from '@/components/shared/Skeletons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'
import { formatDateTime } from '@/lib/format'
import { useListBulkBatchesQuery } from '../api'
import { BatchProgress } from './BatchProgress'
import { BatchStatusBadge } from './BatchStatusBadge'

export function BatchList({ organizationId }: { organizationId: string }) {
  // Batches finish within seconds for demo-sized CSVs, so poll while the page is open
  // rather than building a smarter "only while PROCESSING" refetch strategy.
  const query = useListBulkBatchesQuery({ organizationId }, { pollingInterval: 4000 })

  return (
    <QueryBoundary
      query={query}
      skeleton={<TableSkeleton rows={4} columns={4} />}
      errorTitle="Couldn't load your batches"
      empty={
        <EmptyState
          icon={FileSpreadsheet}
          title="No batches yet"
          description="Upload a CSV above to issue experience letters or salary proofs in bulk."
        />
      }
    >
      {(batches) => (
        <div className="flex flex-col gap-6">
          <BatchProgress batch={batches[0]} />

          {batches.length > 1 && (
            <Section title="Earlier batches">
              <Card className="overflow-hidden p-0">
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
                    {batches.slice(1).map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="tnum whitespace-nowrap text-label text-muted-foreground">
                          {formatDateTime(batch.startedAt)}
                        </TableCell>
                        <TableCell className="text-label">{DOCUMENT_TYPE_LABEL[batch.documentType]}</TableCell>
                        <TableCell>
                          <BatchStatusBadge status={batch.status} />
                        </TableCell>
                        <TableCell className="tnum text-label">
                          {batch.processedRows}/{batch.totalRows}
                          {batch.errorRows > 0 && (
                            <span className="text-revoked"> · {batch.errorRows} errors</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </Section>
          )}
        </div>
      )}
    </QueryBoundary>
  )
}
