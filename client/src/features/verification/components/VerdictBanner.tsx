import { CalendarX, SearchX, ShieldAlert, ShieldCheck, ShieldOff, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Verdict } from '@/features/verification/types'

// Full class strings per verdict so Tailwind can statically detect them.
const VERDICTS: Record<Verdict, { label: string; sub: string; icon: LucideIcon; wrap: string; badge: string }> = {
  VERIFIED: {
    label: 'Document verified',
    sub: 'Every authenticity check passed.',
    icon: ShieldCheck,
    wrap: 'border-verified/30 bg-verified-soft',
    badge: 'bg-verified text-primary-foreground',
  },
  REVOKED: {
    label: 'Document revoked',
    sub: 'The issuer has revoked this document.',
    icon: ShieldOff,
    wrap: 'border-revoked/30 bg-revoked-soft',
    badge: 'bg-revoked text-primary-foreground',
  },
  EXPIRED: {
    label: 'Document expired',
    sub: 'This document is past its validity period.',
    icon: CalendarX,
    wrap: 'border-expired/30 bg-expired-soft',
    badge: 'bg-expired text-primary-foreground',
  },
  INVALID: {
    label: 'Verification failed',
    sub: 'One or more checks did not pass.',
    icon: ShieldAlert,
    wrap: 'border-revoked/30 bg-revoked-soft',
    badge: 'bg-revoked text-primary-foreground',
  },
  NOT_FOUND: {
    label: 'No document found',
    sub: 'We could not find a document for this reference.',
    icon: SearchX,
    wrap: 'border-border bg-surface-2',
    badge: 'bg-subtle text-primary-foreground',
  },
}

export function VerdictBanner({ verdict, anchored }: { verdict: Verdict; anchored: boolean }) {
  const config = VERDICTS[verdict]
  const Icon = config.icon
  const sub = verdict === 'VERIFIED' && anchored ? 'Every authenticity check passed, anchored on-chain.' : config.sub

  return (
    <div className={cn('flex items-center gap-4 rounded-xl border p-5 shadow-soft', config.wrap)}>
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-full', config.badge)}>
        <Icon className="size-6" />
      </span>
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">{config.label}</h2>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}
