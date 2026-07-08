import { PageHeader } from '@/components/shared/PageHeader'
import { BatchList } from '@/features/bulk-issuance/components/BatchList'
import { BulkUploadForm } from '@/features/bulk-issuance/components/BulkUploadForm'
import { useAuth } from '@/hooks/useAuth'

const HrBulkIssuance = () => {
  const { activeOrgId } = useAuth()
  if (!activeOrgId) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Issue"
        description="Upload a CSV to issue experience letters or salary proofs to many employees at once."
      />
      <BulkUploadForm organizationId={activeOrgId} />
      <BatchList organizationId={activeOrgId} />
    </div>
  )
}

export default HrBulkIssuance
