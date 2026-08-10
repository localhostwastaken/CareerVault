import { PageHeader } from '@/components/shared/PageHeader'
import { DocumentList } from '@/features/document/components/DocumentList'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const ManagerSigned = () => {
  useDocumentTitle('Signed')
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Manager portal"
        title="Signed"
        description="Everything you've signed and passed on for HR approval."
      />
      <DocumentList
        role="MANAGER"
        statuses={['PENDING_HR', 'ISSUED', 'ANCHORED', 'REVOKED', 'EXPIRED']}
        emptyTitle="No signed documents yet"
        emptyDescription="Once you sign a request from your inbox, it moves here."
      />
    </div>
  )
}

export default ManagerSigned
