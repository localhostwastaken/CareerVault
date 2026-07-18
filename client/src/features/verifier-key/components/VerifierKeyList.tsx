import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/format'
import { notify, toastApiError } from '@/lib/notify'
import { useListVerifierKeysQuery, useRevokeVerifierKeyMutation } from '../api'
import type { VerifierKey } from '../types'

export function VerifierKeyList() {
  const { data, isLoading } = useListVerifierKeysQuery()
  const [revoke, { isLoading: isRevoking }] = useRevokeVerifierKeyMutation()
  const [target, setTarget] = useState<VerifierKey | null>(null)
  const keys = data ?? []

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (keys.length === 0) {
    return (
      <EmptyState
        icon={KeyRound}
        title="No API keys yet"
        description="Create a key to call the Bulk Verification API."
      />
    )
  }

  const onRevoke = async () => {
    if (!target) return
    try {
      await revoke(target.id).unwrap()
      notify.success('Key revoked.')
      setTarget(null)
    } catch (error) {
      toastApiError(error, 'Could not revoke the key')
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last used</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key) => (
            <TableRow key={key.id}>
              <TableCell>{key.name ?? '—'}</TableCell>
              <TableCell>{key.tier}</TableCell>
              <TableCell>
                <Badge variant={key.status === 'ACTIVE' ? 'verified' : 'revoked'}>{key.status}</Badge>
              </TableCell>
              <TableCell>{formatDateTime(key.lastUsedAt, 'Never')}</TableCell>
              <TableCell className="text-right">
                {key.status === 'ACTIVE' && (
                  <Button variant="destructive" size="sm" onClick={() => setTarget(key)}>
                    Revoke
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title="Revoke API key"
        description="Requests using this key will be rejected immediately. This cannot be undone."
        confirmLabel="Revoke"
        isDestructive
        isLoading={isRevoking}
        onConfirm={onRevoke}
      />
    </>
  )
}
