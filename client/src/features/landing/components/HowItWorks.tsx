import { STAGES } from '@/features/landing/content'

// The product's whole story in one rail: who acts, in what order, and what it
// produces. Numbered so the sequence survives being read out of order.
export function HowItWorks() {
  return (
    <section className="border-t border-border py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <p className="label-micro">How it works</p>
        <h2 className="mt-2 max-w-2xl font-serif text-h1 text-foreground sm:text-display sm:leading-tight">
          Five steps from request to proof.
        </h2>

        <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon
            return (
              <li key={stage.label} className="flex flex-col gap-3 bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="tnum text-h2 text-subtle">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <div>
                  <p className="label-micro">{stage.actor}</p>
                  <h3 className="mt-0.5 text-h3 text-foreground">{stage.label}</h3>
                </div>
                <p className="text-label text-muted-foreground">{stage.body}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
