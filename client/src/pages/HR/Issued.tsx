import { PageHeader } from '@/components/shared/PageHeader'
import { DocumentList } from '@/features/document/components/DocumentList'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const HrIssued = () => {
  useDocumentTitle('Issued')
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="HR portal"
        title="Issued"
        description="Every document your organisation has issued, and its current standing."
      />
      <DocumentList
        role="HR"
        statuses={['ISSUED', 'ANCHORED', 'REVOKED', 'EXPIRED']}
        emptyTitle="No issued documents yet"
        emptyDescription="Approved documents appear here once they're issued."
      />
    </div>
  )
}

export default HrIssued
