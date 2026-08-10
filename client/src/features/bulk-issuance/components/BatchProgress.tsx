import { AlertTriangle, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Notice } from '@/components/shared/Notice'
import { SuccessPanel } from '@/components/shared/SuccessPanel'
import { formatDateTime } from '@/lib/format'
import type { BulkBatch } from '../types'

// Act III for bulk issuance. Previously a polling table simply stopped updating and
// the operator was left to infer that hundreds of documents had been issued.
export function BatchProgress({ batch }: { batch: BulkBatch }) {
  const pct = batch.totalRows > 0 ? Math.round((batch.processedRows / batch.totalRows) * 100) : 0
  const issued = batch.processedRows - batch.errorRows

  if (batch.status === 'PROCESSING') {
    return (
      <Card className="flex flex-col gap-3 p-5" aria-live="polite">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-seal" />
          <h3 className="text-h3 text-foreground">Issuing documents…</h3>
          <span className="tnum ml-auto text-label text-muted-foreground">
            {batch.processedRows} of {batch.totalRows}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Batch progress"
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-label text-muted-foreground">
          Keep this page open — you'll see the result here as soon as it finishes.
        </p>
      </Card>
    )
  }

  if (batch.status === 'FAILED') {
    return (
      <Notice tone="revoked" title="Batch failed">
        Nothing was issued. Check the CSV columns and try again — {batch.errorRows} of {batch.totalRows} rows had
        errors.
      </Notice>
    )
  }

  return (
    <SuccessPanel
      title={issued > 0 ? `${issued} document${issued === 1 ? '' : 's'} issued` : 'Batch finished'}
      description={
        batch.errorRows > 0
          ? 'Some rows could not be processed. Fix them and re-upload just those rows.'
          : 'Every row was issued and each holder has been notified.'
      }
      summary={[
        { label: 'Rows in file', value: batch.totalRows },
        { label: 'Issued', value: issued },
        { label: 'Errors', value: batch.errorRows },
        { label: 'Finished', value: formatDateTime(batch.completedAt) },
      ]}
      artifact={
        batch.errors && batch.errors.length > 0 ? (
          <div className="inset-well flex flex-col gap-2 p-3">
            <p className="label-micro flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-pending" />
              Rows that failed
            </p>
            <ul className="flex flex-col gap-1">
              {batch.errors.slice(0, 8).map((error) => (
                <li key={`${error.row}-${error.email}`} className="text-label text-muted-foreground">
                  <span className="tnum font-mono text-foreground">Row {error.row}</span> · {error.email} —{' '}
                  {error.error}
                </li>
              ))}
              {batch.errors.length > 8 && (
                <li className="text-label text-subtle">and {batch.errors.length - 8} more…</li>
              )}
            </ul>
          </div>
        ) : undefined
      }
    />
  )
}
