import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail } from '@/features/document/types'
import type { AppRole } from '@/features/auth/types'
import { formatDate } from '@/lib/format'

function isReturned(doc: DocumentDetail): boolean {
  const content = doc.contentJson as Record<string, unknown> | null
  return content?.returnedByManager === true
}

// `role` frames the card for the viewing persona: org actors (manager/HR/admin/recruiter)
// need to see WHO each document is for; the holder sees which org it's from.
export function DocumentCard({ document, role }: { document: DocumentDetail; role?: AppRole }) {
  const returned = isReturned(document)
  const forOrgActor = role !== undefined && role !== 'HOLDER'
  const date = formatDate(document.issuedAt ?? document.createdAt)

  return (
    <Link to={`/app/documents/${document.id}`} className="block">
      <Card className="flex items-center justify-between gap-4 p-4 transition-shadow hover:shadow-raised">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{DOCUMENT_TYPE_LABEL[document.type]}</p>
            <p className="truncate text-sm text-muted-foreground">
              {forOrgActor ? `For ${document.holderName}` : document.organizationName} · {date}
            </p>
          </div>
        </div>
        <StatusBadge status={returned ? 'DRAFT' : document.status} label={returned ? 'Returned' : undefined} />
      </Card>
    </Link>
  )
}
