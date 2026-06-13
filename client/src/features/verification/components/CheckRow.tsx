import { CheckCircle2, Clock, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VerificationCheck } from '@/features/verification/types'

const ICON: Record<VerificationCheck['status'], LucideIcon> = {
  pass: CheckCircle2,
  fail: XCircle,
  pending: Clock,
}

const COLOR: Record<VerificationCheck['status'], string> = {
  pass: 'text-verified',
  fail: 'text-revoked',
  pending: 'text-pending',
}

export function CheckRow({ check, step }: { check: VerificationCheck; step: number }) {
  const Icon = ICON[check.status]
  return (
    <li className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-subtle">
        {step}
      </span>
      <Icon className={cn('mt-0.5 size-5 shrink-0', COLOR[check.status])} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{check.label}</p>
        <p className="text-sm text-muted-foreground">{check.detail}</p>
      </div>
    </li>
  )
}
