import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AuditLog } from '@/features/audit/types'
import { formatDateTime } from '@/lib/format'

// Verified/issued events read as good news, failures as bad — the colour carries the
// same meaning as everywhere else in the app.
function actionVariant(action: string): BadgeProps['variant'] {
  if (/VERIFIED|ISSUED|ANCHORED|CREATED/.test(action)) return 'verified'
  if (/FAILED|REVOKED|DELETED/.test(action)) return 'revoked'
  if (/EXPIRED/.test(action)) return 'expired'
  return 'neutral'
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}

export function AuditTable({ logs }: { logs: AuditLog[] }) {
  return (
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
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="tnum whitespace-nowrap text-label text-muted-foreground">
              {/* Local timezone via lib/format — this table once carried its own
                  hardcoded en-GB formatter, which lied to everyone else. */}
              {formatDateTime(log.createdAt)}
            </TableCell>
            <TableCell className="text-label">
              {log.actorType === 'USER' && log.actor ? (
                <span className="font-medium text-foreground">{log.actor.fullName}</span>
              ) : (
                <span className="text-muted-foreground">{log.actorType === 'CRON' ? 'Scheduler' : 'System'}</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={actionVariant(log.action)}>{formatAction(log.action)}</Badge>
            </TableCell>
            <TableCell className="whitespace-nowrap text-label">
              <span className="font-medium text-foreground">{log.entityType}</span>
              <span className="tnum ml-1.5 font-mono text-micro normal-case tracking-normal text-muted-foreground">
                {log.entityId.slice(0, 8)}…
              </span>
            </TableCell>
            <TableCell>
              <Badge variant={log.retentionTier === 'COMPLIANCE' ? 'anchor' : 'neutral'}>
                {log.retentionTier === 'COMPLIANCE' ? 'Compliance' : 'Standard'}
              </Badge>
            </TableCell>
            <TableCell className="tnum font-mono text-micro normal-case tracking-normal text-muted-foreground">
              {log.ipAddress ?? '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
