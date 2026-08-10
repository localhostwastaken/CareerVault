import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { TableSkeleton } from '@/components/shared/Skeletons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/format'
import { notify, toastApiError } from '@/lib/notify'
import { useListVerifierKeysQuery, useRevokeVerifierKeyMutation } from '../api'
import type { VerifierKey } from '../types'

export function VerifierKeyList() {
  const query = useListVerifierKeysQuery()
  const [revoke, { isLoading: isRevoking }] = useRevokeVerifierKeyMutation()
  const [target, setTarget] = useState<VerifierKey | null>(null)

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
      <QueryBoundary
        query={query}
        skeleton={<TableSkeleton rows={3} columns={5} />}
        errorTitle="Couldn't load your API keys"
        empty={
          <EmptyState
            icon={KeyRound}
            title="No API keys yet"
            description="Create a key to start calling the Bulk Verification API."
            className="border-0"
          />
        }
      >
        {(keys) => (
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
                  <TableCell className="text-label font-medium text-foreground">{key.name ?? '—'}</TableCell>
                  <TableCell className="text-label capitalize">{key.tier.replace(/_/g, ' ').toLowerCase()}</TableCell>
                  <TableCell>
                    <Badge variant={key.status === 'ACTIVE' ? 'verified' : 'revoked'}>{key.status}</Badge>
                  </TableCell>
                  <TableCell className="tnum whitespace-nowrap text-label text-muted-foreground">
                    {formatDateTime(key.lastUsedAt, 'Never')}
                  </TableCell>
                  <TableCell className="text-right">
                    {key.status === 'ACTIVE' && (
                      <Button variant="ghost" size="sm" className="text-revoked hover:bg-revoked-soft hover:text-revoked" onClick={() => setTarget(key)}>
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </QueryBoundary>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title="Revoke this API key?"
        description="Requests using this key start failing immediately. This cannot be undone — you'll need to issue a new key."
        confirmLabel="Revoke key"
        isDestructive
        isLoading={isRevoking}
        onConfirm={onRevoke}
      />
    </>
  )
}
