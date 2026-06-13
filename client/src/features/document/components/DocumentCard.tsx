import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail } from '@/features/document/types'
import { formatDate } from '@/lib/format'

export function DocumentCard({ document }: { document: DocumentDetail }) {
  return (
    <Link to={`/app/documents/${document.id}`} className="block">
      <Card className="flex items-center justify-between gap-4 p-4 transition-shadow hover:shadow-raised">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <FileText className="size-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{DOCUMENT_TYPE_LABEL[document.type]}</p>
            <p className="text-sm text-muted-foreground">
              {document.organizationName} · {formatDate(document.issuedAt ?? document.createdAt)}
            </p>
          </div>
        </div>
        <StatusBadge status={document.status} />
      </Card>
    </Link>
  )
}
