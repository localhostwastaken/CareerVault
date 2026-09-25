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
  VERIFIED_PENDING_ANCHOR: {
    // A genuine PASS: signature and hash checks succeeded; only the on-chain anchor is
    // still queued for the next Merkle batch. Never render this as failed/red.
    label: 'Verified — anchoring pending',
    sub: 'Signature and integrity checks passed. On-chain anchoring is scheduled and does not affect validity.',
    icon: ShieldCheck,
    wrap: 'border-anchor/30 bg-anchor-soft',
    seal: 'bg-anchor text-primary-foreground',
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

interface VerdictBannerProps {
  verdict: Verdict
  anchored: boolean
  /** Counted from the returned checks by the caller; omitted when there are none. */
  tally?: { passed: number; total: number }
}

export function VerdictBanner({ verdict, anchored, tally }: VerdictBannerProps) {
  const config = VERDICTS[verdict]
  const Icon = config.icon

  return (
    // role="status" so assistive tech announces the verdict when the report replaces
    // the progress list — this is the one thing the visitor came for.
    <div role="status" className={cn('flex flex-col gap-4 rounded-xl border p-6 sm:flex-row sm:items-start', config.wrap)}>
      <div className="flex min-w-0 flex-1 items-start gap-4">
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
          {verdict === 'VERIFIED_PENDING_ANCHOR' && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-anchor/25 bg-anchor-soft px-2.5 py-1 text-micro text-anchor">
              <Anchor className="size-3.5" />
              Anchoring pending
            </p>
          )}
        </div>
      </div>
      {tally && (
        <p className="shrink-0 border-t border-rule-strong pt-3 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0 sm:text-right">
          <span className="tnum block font-serif text-h1 text-foreground">
            {tally.passed} / {tally.total}
          </span>
          <span className="label-micro">checks passed</span>
        </p>
      )}
    </div>
  )
}
