import { PageHeader } from '@/components/shared/PageHeader'
import { DocumentList } from '@/features/document/components/DocumentList'

const ManagerInbox = () => (
  <div className="space-y-6">
    <PageHeader title="Inbox" description="Document requests awaiting your signature." />
    <DocumentList
      statuses={['REQUESTED', 'DRAFT']}
      emptyTitle="Nothing to sign"
      emptyDescription="New requests routed to you will appear here."
    />
  </div>
)

export default ManagerInbox
