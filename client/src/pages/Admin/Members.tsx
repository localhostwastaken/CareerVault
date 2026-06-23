import { Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useListMembersQuery } from '@/features/member/api'
import { AddMemberDialog } from '@/features/member/components/AddMemberDialog'
import { MembersTable } from '@/features/member/components/MembersTable'
import { useAuth } from '@/hooks/useAuth'

const AdminMembers = () => {
  const { activeOrgId, role: activeRole } = useAuth()
  const isAdmin = activeRole === 'ORG_ADMIN'
  const orgId = isAdmin ? activeOrgId : null
  const { data: members, isLoading } = useListMembersQuery(orgId ?? '', { skip: !orgId })

  if (!orgId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Members" />
        <EmptyState icon={Users} title="No organization yet" description="Create your organization first." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Manage who can issue and approve documents."
        actions={<AddMemberDialog orgId={orgId} />}
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : members && members.length > 0 ? (
        <Card className="overflow-hidden">
          <MembersTable orgId={orgId} members={members} />
        </Card>
      ) : (
        <EmptyState icon={Users} title="No members yet" description="Add managers, HR, and recruiters to your organization." />
      )}
    </div>
  )
}

export default AdminMembers
