import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useListAuditLogsQuery } from '@/features/audit/api'
import type { BadgeProps } from '@/components/ui/badge'

const PAGE_SIZE = 20

function actionVariant(action: string): BadgeProps['variant'] {
  if (/VERIFIED|ISSUED|ANCHORED/.test(action)) return 'verified'
  if (/FAILED|REVOKED/.test(action))           return 'revoked'
  if (/EXPIRED/.test(action))                  return 'expired'
  return 'neutral'
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function AdminAuditLog() {
  const [page, setPage]               = useState(1)
  const [action, setAction]           = useState('')
  const [actorType, setActorType]     = useState('')
  const [retentionTier, setRetention] = useState('')

  const { data, isLoading } = useListAuditLogsQuery({
    page,
    limit: PAGE_SIZE,
    ...(action        ? { action }        : {}),
    ...(actorType     ? { actorType }     : {}),
    ...(retentionTier ? { retentionTier } : {}),
  })

  const totalPages = data ? Math.ceil(data.meta.total / PAGE_SIZE) : 1
  const hasFilters = Boolean(action || actorType || retentionTier)

  const clearFilters = () => {
    setAction('')
    setActorType('')
    setRetention('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Compliance and security event trail for your organization."
      />

      {/* Filter bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Filter by action…"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1) }}
            className="w-52"
          />
          <SelectNative
            value={actorType}
            onChange={(e) => { setActorType(e.target.value); setPage(1) }}
            className="w-36"
          >
            <option value="">All actors</option>
            <option value="USER">User</option>
            <option value="SYSTEM">System</option>
            <option value="CRON">Cron</option>
          </SelectNative>
          <SelectNative
            value={retentionTier}
            onChange={(e) => { setRetention(e.target.value); setPage(1) }}
            className="w-44"
          >
            <option value="">All tiers</option>
            <option value="COMPLIANCE">Compliance (7 yr)</option>
            <option value="STANDARD">Standard (90 d)</option>
          </SelectNative>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : !data || data.logs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={ShieldCheck}
              title="No audit events"
              description="Events will appear here as actions are performed in your organization."
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="tnum whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </TableCell>

                    <TableCell className="text-sm">
                      {log.actorType === 'USER' && log.actor ? (
                        <span className="font-medium text-foreground">
                          {log.actor.fullName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {log.actorType === 'CRON' ? 'Scheduler' : 'System'}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant={actionVariant(log.action)}>
                        {formatAction(log.action)}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs">
                      <span className="font-medium text-foreground">
                        {log.entityType}
                      </span>
                      <span className="tnum ml-1 text-muted-foreground">
                        {log.entityId.slice(0, 8)}…
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          log.retentionTier === 'COMPLIANCE' ? 'anchor' : 'neutral'
                        }
                      >
                        {log.retentionTier === 'COMPLIANCE' ? 'Compliance' : 'Standard'}
                      </Badge>
                    </TableCell>

                    <TableCell className="tnum text-xs text-muted-foreground">
                      {log.ipAddress ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {data.meta.total} events · page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
