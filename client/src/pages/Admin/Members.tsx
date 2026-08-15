import { Building2, UserPlus, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { TableSkeleton } from '@/components/shared/Skeletons'
import { useListMembersQuery } from '@/features/member/api'
import { AddMemberDialog } from '@/features/member/components/AddMemberDialog'
import { MembersTable } from '@/features/member/components/MembersTable'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const AdminMembers = () => {
  useDocumentTitle('Members')
  const { activeOrgId, role } = useAuth()
  const orgId = role === 'ORG_ADMIN' ? activeOrgId : null
  const query = useListMembersQuery(orgId ?? '', { skip: !orgId })

  if (!orgId) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader eyebrow="Admin console" title="Members" />
        <EmptyState
          icon={Building2}
          title="No organisation yet"
          description="Create your organisation before inviting people to it."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Admin console"
        title="Members"
        description="Who can draft, sign, approve and issue documents on behalf of your organisation."
        actions={<AddMemberDialog orgId={orgId} />}
      />

      <QueryBoundary
        query={query}
        skeleton={<TableSkeleton rows={5} columns={5} />}
        errorTitle="Couldn't load members"
        empty={
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Add managers to sign documents, HR to approve them, and recruiters to search talent."
            action={
              <span className="inline-flex items-center gap-1.5 text-label text-muted-foreground">
                <UserPlus className="size-4" />
                Use “Add member” above
              </span>
            }
          />
        }
      >
        {(members) => (
          <Card className="overflow-hidden p-0">
            <MembersTable orgId={orgId} members={members} />
          </Card>
        )}
      </QueryBoundary>
    </div>
  )
}

export default AdminMembers
