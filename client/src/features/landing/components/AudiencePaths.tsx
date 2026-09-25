import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PATHS } from '@/features/landing/content'

// Six personas share this product; a single generic CTA serves none of them. Ruled
// columns rather than boxes: the page already has a boxed hero sample and a timeline.
export function AudiencePaths() {
  return (
    <section className="border-t border-border bg-surface-2/50 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <p className="label-micro">Where do you fit</p>
        <h2 className="mt-2 max-w-2xl font-serif text-h1 text-foreground sm:text-display sm:leading-tight">
          Start from your side of the document.
        </h2>

        <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-8">
          {PATHS.map((path) => {
            const Icon = path.icon
            return (
              <div key={path.audience} className="flex flex-col gap-2 border-t-2 border-rule-strong pt-5">
                <p className="label-micro flex items-center gap-1.5">
                  <Icon className="size-3.5 text-seal" aria-hidden />
                  {path.audience}
                </p>
                <h3 className="font-serif text-h1 text-foreground">{path.headline}</h3>
                <p className="flex-1 text-body text-muted-foreground">{path.body}</p>
                <Link
                  to={path.to}
                  className="focus-ring group mt-3 inline-flex items-center gap-1.5 self-start rounded text-label font-semibold text-seal hover:underline"
                >
                  {path.cta}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
