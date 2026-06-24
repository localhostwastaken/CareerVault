import { Anchor, BadgeCheck, CalendarX, Clock, FileText, ShieldOff, type LucideIcon } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'

// Canonical document statuses (R1). Status is always icon + text + color.
export type DocumentStatus = 'REQUESTED' | 'DRAFT' | 'PENDING_HR' | 'ISSUED' | 'ANCHORED' | 'REVOKED' | 'EXPIRED'

const MAP: Record<DocumentStatus, { label: string; variant: NonNullable<BadgeProps['variant']>; icon: LucideIcon }> = {
  REQUESTED: { label: 'Requested', variant: 'neutral', icon: FileText },
  DRAFT: { label: 'Draft', variant: 'pending', icon: FileText },
  PENDING_HR: { label: 'Pending HR', variant: 'pending', icon: Clock },
  ISSUED: { label: 'Issued', variant: 'verified', icon: BadgeCheck },
  ANCHORED: { label: 'Anchored', variant: 'verified', icon: Anchor },
  REVOKED: { label: 'Revoked', variant: 'revoked', icon: ShieldOff },
  EXPIRED: { label: 'Expired', variant: 'expired', icon: CalendarX },
}

export function StatusBadge({ status, label }: { status: DocumentStatus; label?: string }) {
  const config = MAP[status]
  const Icon = config.icon
  return (
    <Badge variant={config.variant}>
      <Icon />
      {label ?? config.label}
    </Badge>
  )
}
