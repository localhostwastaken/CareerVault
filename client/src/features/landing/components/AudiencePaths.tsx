import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PATHS } from '@/features/landing/content'

// Six personas share this product; a single generic CTA serves none of them.
// Each card is a whole card-link so the entire target is clickable and focusable once.
export function AudiencePaths() {
  return (
    <section className="border-t border-border bg-surface-2/50 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <p className="label-micro">Where do you fit</p>
        <h2 className="mt-2 max-w-2xl font-serif text-h1 text-foreground sm:text-display sm:leading-tight">
          Start from your side of the document.
        </h2>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PATHS.map((path) => {
            const Icon = path.icon
            return (
              <Card key={path.audience} className="group transition-colors hover:border-rule-strong">
                <Link to={path.to} className="focus-ring flex h-full flex-col p-6">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <p className="label-micro mt-5">{path.audience}</p>
                  <h3 className="mt-1 font-serif text-h1 text-foreground">{path.headline}</h3>
                  <p className="mt-2 flex-1 text-body text-muted-foreground">{path.body}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-label font-semibold text-seal">
                    {path.cta}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
