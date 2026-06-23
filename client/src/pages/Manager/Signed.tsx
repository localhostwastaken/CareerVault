import { PageHeader } from '@/components/shared/PageHeader'
import { DocumentList } from '@/features/document/components/DocumentList'

const ManagerSigned = () => (
  <div className="space-y-6">
    <PageHeader title="Signed" description="Documents you've signed and sent on for approval." />
    <DocumentList
      role="MANAGER"
      statuses={['PENDING_HR', 'ISSUED', 'ANCHORED', 'REVOKED', 'EXPIRED']}
      emptyTitle="No signed documents yet"
      emptyDescription="Once you sign a request, it moves here."
    />
  </div>
)

export default ManagerSigned
