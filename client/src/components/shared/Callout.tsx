import type { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CalloutVariant = 'info' | 'success' | 'warning' | 'danger'

// Bordered inline alert. Colors come from the fixed status tokens (never raw hex),
// so a warning always reads amber and a danger always reads red — matching StatusBadge.
const VARIANTS: Record<CalloutVariant, { container: string; accent: string; icon: LucideIcon }> = {
  info: { container: 'border-primary/20 bg-accent', accent: 'text-accent-foreground', icon: Info },
  success: { container: 'border-verified/30 bg-verified-soft', accent: 'text-verified', icon: CheckCircle2 },
  warning: { container: 'border-pending/30 bg-pending-soft', accent: 'text-pending', icon: AlertTriangle },
  danger: { container: 'border-revoked/30 bg-revoked-soft', accent: 'text-revoked', icon: AlertCircle },
}

interface CalloutProps {
  variant?: CalloutVariant
  title?: string
  icon?: LucideIcon
  children?: ReactNode
  className?: string
}

export function Callout({ variant = 'info', title, icon, children, className }: CalloutProps) {
  const config = VARIANTS[variant]
  const Icon = icon ?? config.icon
  // Warnings/dangers are announced to assistive tech; info/success are polite status.
  const role = variant === 'warning' || variant === 'danger' ? 'alert' : 'status'
  return (
    <div role={role} className={cn('flex items-start gap-3 rounded-xl border p-4', config.container, className)}>
      <Icon className={cn('mt-0.5 size-5 shrink-0', config.accent)} />
      <div className="min-w-0 text-sm">
        {title && <p className={cn('font-semibold', config.accent)}>{title}</p>}
        {children && <div className={cn('text-muted-foreground', title && 'mt-1')}>{children}</div>}
      </div>
    </div>
  )
}
