import { Link } from 'react-router-dom'
import { ChevronRight, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { documentProgress, isReturned } from '@/features/document/documentProgress'
import { documentReference } from '@/features/document/reference'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail } from '@/features/document/types'
import { formatDate } from '@/lib/format'

interface DocumentCardProps {
  document: DocumentDetail
  /** Issuer queues care who the document is FOR; a holder's own wallet does not. */
  showHolder?: boolean
}

export function DocumentCard({ document, showHolder = false }: DocumentCardProps) {
  const returned = isReturned(document)
  // Issuer queues read as a worklist ("For Jane Doe"); a wallet reads as provenance.
  const subject = showHolder ? `For ${document.holderName}` : document.organizationName
  const progress = documentProgress(document)
  const reference = documentReference(document)

  return (
    <Card className="transition-colors hover:border-rule-strong hover:bg-surface-2/40">
      {/* The whole row is the link, and it carries a focus ring — previously the
          card was wrapped in a bare <Link> with no visible focus state at all. */}
      <Link
        to={`/app/documents/${document.id}`}
        className="focus-ring flex items-center gap-4 p-4"
        aria-label={`${DOCUMENT_TYPE_LABEL[document.type]} — ${subject}`}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-label font-semibold text-foreground">{DOCUMENT_TYPE_LABEL[document.type]}</p>
          <p className="truncate text-label text-muted-foreground">
            {subject}
            <span className="text-subtle"> · </span>
            <span className="tnum">{formatDate(document.issuedAt ?? document.createdAt)}</span>
          </p>
          {/* Who has it right now. Scanning a list should answer that without a click. */}
          <p className="truncate text-label text-subtle">{progress.short}</p>
          {/* Wraps instead of truncating: the unique part of a reference is its tail. */}
          <p className="tnum mt-0.5 break-all font-mono text-micro text-subtle">{reference}</p>
        </div>
        <StatusBadge status={returned ? 'DRAFT' : document.status} label={returned ? 'Returned' : undefined} />
        <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />
      </Link>
    </Card>
  )
}
