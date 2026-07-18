import { CheckCircle2, Clock, XCircle, type LucideIcon } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import type { BulkBatchStatus } from '../types'

const MAP: Record<BulkBatchStatus, { label: string; variant: NonNullable<BadgeProps['variant']>; icon: LucideIcon }> = {
  PROCESSING: { label: 'Processing', variant: 'pending', icon: Clock },
  COMPLETED: { label: 'Completed', variant: 'verified', icon: CheckCircle2 },
  FAILED: { label: 'Failed', variant: 'revoked', icon: XCircle },
}

export function BatchStatusBadge({ status }: { status: BulkBatchStatus }) {
  const config = MAP[status]
  const Icon = config.icon
  return (
    <Badge variant={config.variant}>
      <Icon />
      {config.label}
    </Badge>
  )
}
