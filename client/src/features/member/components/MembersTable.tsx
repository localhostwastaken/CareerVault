import { useState } from 'react'
import { UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useRemoveMemberMutation } from '@/features/member/api'
import type { Member } from '@/features/member/types'
import { notify, toastApiError } from '@/lib/notify'

const ROLE_LABEL: Record<string, string> = {
  ORG_ADMIN: 'Org Admin',
  MANAGER: 'Manager',
  HR: 'HR',
  RECRUITER: 'Recruiter',
}

export function MembersTable({ orgId, members }: { orgId: string; members: Member[] }) {
  const [removeMember, { isLoading }] = useRemoveMemberMutation()
  const [target, setTarget] = useState<Member | null>(null)

  const onConfirm = async () => {
    if (!target) return
    try {
      await removeMember({ orgId, memberId: target.id }).unwrap()
      notify.success('Member deactivated')
      setTarget(null)
    } catch (error) {
      toastApiError(error)
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.fullName}</TableCell>
              <TableCell className="text-muted-foreground">{member.email}</TableCell>
              <TableCell>
                <Badge variant="primary">{ROLE_LABEL[member.role] ?? member.role}</Badge>
              </TableCell>
              <TableCell>
                {member.isActive ? <Badge variant="verified">Active</Badge> : <Badge variant="expired">Inactive</Badge>}
              </TableCell>
              <TableCell className="text-right">
                {member.isActive && (
                  <Button size="sm" variant="ghost" onClick={() => setTarget(member)}>
                    <UserX />
                    Deactivate
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(value) => !value && setTarget(null)}
        title="Deactivate member?"
        description={target ? `${target.fullName} will lose access to this organization.` : ''}
        confirmLabel="Deactivate"
        isDestructive
        isLoading={isLoading}
        onConfirm={onConfirm}
      />
    </>
  )
}
