import { Building2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Explainer } from '@/components/shared/Explainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { Section } from '@/components/shared/Section'
import { BatchList } from '@/features/bulk-issuance/components/BatchList'
import { BulkUploadForm } from '@/features/bulk-issuance/components/BulkUploadForm'
import { BULK_ISSUANCE_STEPS } from '@/features/bulk-issuance/bulkIssuanceSteps'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const HrBulkIssuance = () => {
  useDocumentTitle('Bulk issue')
  const { activeOrgId } = useAuth()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="HR portal"
        title="Bulk issue"
        description="Upload a CSV to issue experience letters or salary proofs to many people at once."
      />

      {/* Rendering nothing at all (the previous behaviour) looks like a broken page. */}
      {!activeOrgId ? (
        <EmptyState
          icon={Building2}
          title="No organisation selected"
          description="Switch to an organisation persona to issue documents in bulk."
        />
      ) : (
        <>
          <Section title="New batch" description="One row per person. Existing holders are matched by email.">
            <BulkUploadForm organizationId={activeOrgId} />
            <Explainer title="What happens to each row" steps={BULK_ISSUANCE_STEPS} />
          </Section>
          <Section title="Batches">
            <BatchList organizationId={activeOrgId} />
          </Section>
        </>
      )}
    </div>
  )
}

export default HrBulkIssuance
