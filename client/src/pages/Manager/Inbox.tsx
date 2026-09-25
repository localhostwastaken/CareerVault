import { PenLine } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DocumentList } from '@/features/document/components/DocumentList'
import type { QueueConfig } from '@/features/document/components/WorkQueue'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const QUEUE: QueueConfig = {
  countLabel: 'Awaiting your signature',
  waitingLabel: 'Requested',
  waitingSince: (document) => document.createdAt,
  actionLabel: 'Draft & sign',
  actionIcon: PenLine,
  actionHref: (document) => `/app/documents/${document.id}/sign`,
}

const ManagerInbox = () => {
  useDocumentTitle('Inbox')
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Manager portal"
        title="Inbox"
        description="Document requests routed to you, waiting to be drafted and signed."
      />
      <DocumentList
        role="MANAGER"
        statuses={['REQUESTED', 'DRAFT']}
        emptyTitle="Nothing to sign"
        emptyDescription="New requests assigned to you will appear here."
        queue={QUEUE}
      />
    </div>
  )
}

export default ManagerInbox
