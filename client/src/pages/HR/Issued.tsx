import { PageHeader } from '@/components/shared/PageHeader'
import { DocumentList } from '@/features/document/components/DocumentList'

const HrIssued = () => (
  <div className="space-y-6">
    <PageHeader title="Issued" description="Documents your organization has issued." />
    <DocumentList
      statuses={['ISSUED', 'ANCHORED', 'REVOKED', 'EXPIRED']}
      emptyTitle="No issued documents yet"
      emptyDescription="Approved documents appear here once issued."
    />
  </div>
)

export default HrIssued
