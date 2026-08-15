import { PageHeader } from '@/components/shared/PageHeader'
import { OrgOnboarding } from '@/features/organization/components/OrgOnboarding'
import { OrgSettings } from '@/features/organization/components/OrgSettings'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const AdminOrganization = () => {
  useDocumentTitle('Organization')
  const { activeOrgId, role } = useAuth()
  // Unaffiliated users reach this route to create their first org; members manage
  // the existing one. Same route, two entirely different jobs.
  const hasOrg = role === 'ORG_ADMIN' && Boolean(activeOrgId)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Admin console"
        title={hasOrg ? 'Organization' : 'Set up your organization'}
        description={
          hasOrg
            ? 'Your organisation profile and domain verification.'
            : 'Create your organisation and prove your domain to start issuing verified documents.'
        }
      />
      {hasOrg && activeOrgId ? <OrgSettings orgId={activeOrgId} /> : <OrgOnboarding />}
    </div>
  )
}

export default AdminOrganization
