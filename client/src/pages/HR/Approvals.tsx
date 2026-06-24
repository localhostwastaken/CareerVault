import { PageHeader } from '@/components/shared/PageHeader'
import { DocumentList } from '@/features/document/components/DocumentList'

const HrApprovals = () => (
  <div className="space-y-6">
    <PageHeader title="Approvals" description="Signed documents waiting for HR co-signature and issuance." />
    <DocumentList
      role="HR"
      statuses={['PENDING_HR']}
      emptyTitle="Nothing to approve"
      emptyDescription="Documents signed by managers will land here for review."
    />
  </div>
)

export default HrApprovals
