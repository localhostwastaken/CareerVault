import { PageHeader } from '@/components/shared/PageHeader'
import { DocumentList } from '@/features/document/components/DocumentList'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

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
      />
    </div>
  )
}

export default ManagerInbox
