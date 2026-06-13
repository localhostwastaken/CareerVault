import { PageHeader } from '@/components/shared/PageHeader'
import { OrgOnboarding } from '@/features/organization/components/OrgOnboarding'
import { OrgSettings } from '@/features/organization/components/OrgSettings'
import { useAuth } from '@/hooks/useAuth'

const AdminOrganization = () => {
  const { user } = useAuth()
  const adminOrgId = user?.memberships.find((m) => m.role === 'ORG_ADMIN')?.organizationId

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization"
        description={adminOrgId ? 'Manage your organization and domain verification.' : 'Set up your organization to start issuing documents.'}
      />
      {adminOrgId ? <OrgSettings orgId={adminOrgId} /> : <OrgOnboarding />}
    </div>
  )
}

export default AdminOrganization
