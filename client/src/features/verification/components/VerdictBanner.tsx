import { Anchor, CalendarX, SearchX, ShieldAlert, ShieldCheck, ShieldOff, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Verdict } from '@/features/verification/types'

// Full class strings per verdict so Tailwind can statically detect them.
const VERDICTS: Record<Verdict, { label: string; sub: string; icon: LucideIcon; wrap: string; seal: string }> = {
  VERIFIED: {
    label: 'Document verified',
    sub: 'Every authenticity check passed.',
    icon: ShieldCheck,
    wrap: 'border-verified/30 bg-verified-soft',
    seal: 'bg-verified text-primary-foreground',
  },
  REVOKED: {
    label: 'Document revoked',
    sub: 'The issuer has withdrawn this document. Do not rely on it.',
    icon: ShieldOff,
    wrap: 'border-revoked/30 bg-revoked-soft',
    seal: 'bg-revoked text-primary-foreground',
  },
  EXPIRED: {
    label: 'Document expired',
    sub: 'This document was genuine but is past its validity period.',
    icon: CalendarX,
    wrap: 'border-expired/30 bg-expired-soft',
    seal: 'bg-expired text-primary-foreground',
  },
  INVALID: {
    label: 'Verification failed',
    sub: 'One or more authenticity checks did not pass. Treat this document as unproven.',
    icon: ShieldAlert,
    wrap: 'border-revoked/30 bg-revoked-soft',
    seal: 'bg-revoked text-primary-foreground',
  },
  NOT_FOUND: {
    label: 'No document found',
    sub: 'Nothing in CareerVault matches this reference. Check the link for typos.',
    icon: SearchX,
    wrap: 'border-rule-strong bg-surface-2',
    seal: 'bg-expired text-primary-foreground',
  },
}

export function VerdictBanner({ verdict, anchored }: { verdict: Verdict; anchored: boolean }) {
  const config = VERDICTS[verdict]
  const Icon = config.icon

  return (
    // role="status" so assistive tech announces the verdict when the report replaces
    // the progress list — this is the one thing the visitor came for.
    <div role="status" className={cn('rounded-xl border p-6', config.wrap)}>
      <div className="flex items-start gap-4">
        <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-full', config.seal)}>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <h1 className="font-serif text-h1 text-foreground">{config.label}</h1>
          <p className="mt-1 text-body text-muted-foreground">{config.sub}</p>
          {verdict === 'VERIFIED' && anchored && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-anchor/25 bg-anchor-soft px-2.5 py-1 text-micro text-anchor">
              <Anchor className="size-3.5" />
              Anchored on-chain
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
