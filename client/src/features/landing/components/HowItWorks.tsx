import { Anchor, CheckCircle2 } from 'lucide-react'
import { EXAMPLE_RECORD, type RecordEvent } from '@/features/landing/content'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const TONE = {
  anchor: { className: 'text-anchor', icon: Anchor },
  verified: { className: 'text-verified', icon: CheckCircle2 },
} as const

function Evidence({ evidence }: { evidence: RecordEvent['evidence'] }) {
  const tone = evidence.tone ? TONE[evidence.tone] : null
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label">
      <span className="label-micro">{evidence.label}</span>
      <span className={cn('flex items-center gap-1.5 text-foreground', evidence.isMono && 'tnum font-mono', tone?.className)}>
        {tone && <tone.icon className="size-3.5" aria-hidden />}
        {evidence.value}
      </span>
    </p>
  )
}

// The product's story told as the record it produces: one document's events, in order,
// each with who acted, when, and the identifier it left behind.
export function HowItWorks() {
  return (
    <section className="border-t border-border py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <p className="label-micro">How it works</p>
        <h2 className="mt-2 max-w-2xl font-serif text-h1 text-foreground sm:text-display sm:leading-tight">
          Five steps from request to proof.
        </h2>
        <p className="mt-3 max-w-2xl text-body-lg text-muted-foreground">
          One example record, followed from request to verification. Every row is an event CareerVault keeps.
        </p>
      </div>
      <div className="mx-auto mt-10 grid max-w-6xl gap-10 px-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16 lg:px-8">
        <div>
          <dl className="grid grid-cols-2 gap-4 border-t-2 border-rule-strong pt-4 lg:sticky lg:top-24 lg:grid-cols-1">
            <div>
              <dt className="label-micro">Example credential</dt>
              <dd className="mt-1 text-body text-foreground">{EXAMPLE_RECORD.type}</dd>
            </div>
            <div>
              <dt className="label-micro">Holder · Issuer</dt>
              <dd className="mt-1 text-body text-foreground">
                {EXAMPLE_RECORD.holder} · {EXAMPLE_RECORD.issuer}
              </dd>
            </div>
            <div className="col-span-2 lg:col-span-1">
              <dt className="label-micro">Reference</dt>
              <dd className="tnum mt-1 break-all font-mono text-label text-foreground">{EXAMPLE_RECORD.reference}</dd>
            </div>
          </dl>
        </div>

        <ol aria-label="Example record events" className="border-t-2 border-rule-strong">
          {EXAMPLE_RECORD.events.map((event) => (
            <li
              key={event.step}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 border-b border-border py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]"
            >
              <span className="tnum text-h2 text-subtle">{event.step}</span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="label-micro">
                  {event.role} · {event.actor}
                </p>
                <h3 className="text-h3 text-foreground">{event.action}</h3>
                <p className="text-body text-muted-foreground">{event.detail}</p>
                <Evidence evidence={event.evidence} />
              </div>
              <time
                dateTime={event.at}
                className="tnum col-start-2 font-mono text-micro text-subtle sm:col-start-3 sm:row-start-1 sm:text-right"
              >
                {formatDateTime(event.at)}
              </time>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
