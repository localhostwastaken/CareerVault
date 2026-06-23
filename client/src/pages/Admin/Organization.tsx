import { PageHeader } from '@/components/shared/PageHeader'
import { OrgOnboarding } from '@/features/organization/components/OrgOnboarding'
import { OrgSettings } from '@/features/organization/components/OrgSettings'
import { useAuth } from '@/hooks/useAuth'

const AdminOrganization = () => {
  const { activeOrgId, role: activeRole } = useAuth()
  const isAdmin = activeRole === 'ORG_ADMIN'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization"
        description={isAdmin && activeOrgId ? 'Manage your organization and domain verification.' : 'Set up your organization to start issuing documents.'}
      />
      {isAdmin && activeOrgId ? <OrgSettings orgId={activeOrgId} /> : <OrgOnboarding />}
    </div>
  )
}

export default AdminOrganization
