import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { isReturned } from '@/features/document/documentProgress'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail } from '@/features/document/types'
import { formatDateTime, formatRelativeTime } from '@/lib/format'

export interface QueueConfig {
  /** Caption for the count line, e.g. "Pending review". */
  countLabel: string
  /** Column head for how long an item has waited, e.g. "Requested". */
  waitingLabel: string
  waitingSince: (document: DocumentDetail) => string
  actionLabel: string
  actionIcon: LucideIcon
  actionHref: (document: DocumentDetail) => string
}


function RowStatus({ document }: { document: DocumentDetail }) {
  const returned = isReturned(document)
  return <StatusBadge status={returned ? 'DRAFT' : document.status} label={returned ? 'Returned' : undefined} />
}

function Waiting({ at }: { at: string }) {
  return (
    <time dateTime={at} title={formatDateTime(at)} className="tnum text-label text-muted-foreground">
      {formatRelativeTime(at)}
    </time>
  )
}

// A worklist, not an archive: who it is for, what it is, how long it has waited, and
// the one action that clears it. Tables collapse to ruled rows below md.
export function WorkQueue({ documents, config }: { documents: DocumentDetail[]; config: QueueConfig }) {
  const Icon = config.actionIcon
  // A status column that says the same thing on every row is noise.
  const showStatus = new Set(documents.map((d) => (isReturned(d) ? 'RETURNED' : d.status))).size > 1
  const action = (document: DocumentDetail) => (
    <Button asChild size="sm">
      <Link
        to={config.actionHref(document)}
        aria-label={`${config.actionLabel}: ${DOCUMENT_TYPE_LABEL[document.type]} for ${document.holderName}`}
      >
        <Icon />
        {config.actionLabel}
      </Link>
    </Button>
  )

  return (
    <Card className="overflow-hidden">
      <p className="label-micro border-b border-border px-4 py-3">
        {config.countLabel} · <span className="tnum">{documents.length}</span>
      </p>

      {/* lg, not md: beside the sidebar a tablet has too little width, and a table
          that scrolls its action column out of view hides the one thing to do. */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Holder</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>{config.waitingLabel}</TableHead>
              <TableHead className="pr-4 text-right">
                <span className="sr-only">Action</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell className="pl-4">
                  <div className="max-w-48 xl:max-w-xs">
                    <p className="truncate text-label font-semibold text-foreground" title={document.holderName}>
                      {document.holderName}
                    </p>
                    <p className="truncate text-label text-subtle" title={document.holderEmail}>
                      {document.holderEmail}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-label text-foreground">{DOCUMENT_TYPE_LABEL[document.type]}</p>
                  {showStatus && (
                    <div className="mt-1.5">
                      <RowStatus document={document} />
                    </div>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Waiting at={config.waitingSince(document)} />
                </TableCell>
                <TableCell className="whitespace-nowrap pr-4 text-right">{action(document)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="lg:hidden">
        {documents.map((document) => (
          <li key={document.id} className="flex items-center gap-3 border-b border-border p-4 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-label font-semibold text-foreground">{document.holderName}</p>
              <p className="truncate text-label text-muted-foreground">{DOCUMENT_TYPE_LABEL[document.type]}</p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-label text-subtle">
                {config.waitingLabel} <Waiting at={config.waitingSince(document)} />
              </p>
              {showStatus && (
                <div className="mt-2">
                  <RowStatus document={document} />
                </div>
              )}
            </div>
            <div className="shrink-0">{action(document)}</div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
