import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  hint?: string
  /** Tints the figure when it carries status meaning, e.g. a revoked count. */
  tone?: 'default' | 'verified' | 'pending' | 'revoked' | 'anchor'
  className?: string
}

const TONE = {
  default: 'text-foreground',
  verified: 'text-verified',
  pending: 'text-pending',
  revoked: 'text-revoked',
  anchor: 'text-anchor',
} as const

// A stat is read, not clicked — no hover affordance. The previous version lifted on
// hover, which implied a link that was never there.
export function StatCard({ label, value, icon: Icon, hint, tone = 'default', className }: StatCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="label-micro">{label}</span>
        {Icon && <Icon className="size-4 shrink-0 text-subtle" />}
      </div>
      <div className={cn('tnum mt-2 text-h1 font-bold', TONE[tone])}>{value}</div>
      {hint && <p className="mt-1 text-label text-muted-foreground">{hint}</p>}
    </Card>
  )
}
