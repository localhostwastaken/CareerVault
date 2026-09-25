import { FileSearch } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DocumentList } from '@/features/document/components/DocumentList'
import type { QueueConfig } from '@/features/document/components/WorkQueue'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// Approve/return live on the record itself, next to the content and signature evidence.
const QUEUE: QueueConfig = {
  countLabel: 'Pending review',
  waitingLabel: 'Signed',
  waitingSince: (document) => document.updatedAt,
  actionLabel: 'Review',
  actionIcon: FileSearch,
  actionHref: (document) => `/app/documents/${document.id}`,
}

const HrApprovals = () => {
  useDocumentTitle('Approvals')
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="HR portal"
        title="Approvals"
        description="Manager-signed documents waiting on your co-signature before they're issued."
      />
      <DocumentList
        role="HR"
        statuses={['PENDING_HR']}
        emptyTitle="Nothing to approve"
        emptyDescription="Documents signed by managers land here for your review."
        queue={QUEUE}
      />
    </div>
  )
}

export default HrApprovals
