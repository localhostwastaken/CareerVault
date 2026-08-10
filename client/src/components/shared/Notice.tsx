import type { ReactNode } from 'react'
import { AlertTriangle, BadgeCheck, Info, ShieldOff, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NoticeTone = 'pending' | 'revoked' | 'verified' | 'neutral'

interface NoticeProps {
  tone: NoticeTone
  title: string
  icon?: LucideIcon
  children?: ReactNode
  actions?: ReactNode
  className?: string
}

// Full class strings per tone so Tailwind can statically detect them.
const TONE: Record<NoticeTone, { wrap: string; text: string; icon: LucideIcon }> = {
  pending: { wrap: 'border-pending/30 bg-pending-soft', text: 'text-pending', icon: AlertTriangle },
  revoked: { wrap: 'border-revoked/30 bg-revoked-soft', text: 'text-revoked', icon: ShieldOff },
  verified: { wrap: 'border-verified/30 bg-verified-soft', text: 'text-verified', icon: BadgeCheck },
  neutral: { wrap: 'border-border bg-surface-2', text: 'text-foreground', icon: Info },
}

// One inline-callout implementation. Revocation notices, returned-for-revision
// banners and DNS-verification prompts were each hand-rolling their own tinted box,
// which is how raw `bg-amber-50` literals crept in.
export function Notice({ tone, title, icon, children, actions, className }: NoticeProps) {
  const config = TONE[tone]
  const Icon = icon ?? config.icon

  return (
    <div role="note" className={cn('rounded-xl border p-5', config.wrap, className)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 size-5 shrink-0', config.text)} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className={cn('text-label font-semibold', config.text)}>{title}</p>
          {children && <div className="text-body text-muted-foreground">{children}</div>}
          {actions && <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div>}
        </div>
      </div>
    </div>
  )
}
