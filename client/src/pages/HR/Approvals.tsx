import { PageHeader } from '@/components/shared/PageHeader'
import { DocumentList } from '@/features/document/components/DocumentList'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

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
      />
    </div>
  )
}

export default HrApprovals
