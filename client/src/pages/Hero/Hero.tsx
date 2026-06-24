import { Link } from 'react-router-dom'
import { Anchor, ArrowRight, FileCheck2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const FEATURES = [
  {
    icon: FileCheck2,
    title: 'Tamper-evident documents',
    body: 'Experience letters, salary proofs, and recommendations — dual-signed by manager and HR.',
  },
  {
    icon: Anchor,
    title: 'Anchored on-chain',
    body: 'Daily Merkle roots are anchored to a public ledger, creating an immutable proof of existence.',
  },
  {
    icon: ShieldCheck,
    title: 'Verify in seconds',
    body: 'Recruiters run a six-step cryptographic check from a single share link — no account needed.',
  },
] as const

const Hero = () => {
  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-8">
      <section className="flex flex-col items-center py-20 text-center lg:py-28">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-anchor-soft px-3 py-1 text-xs font-semibold text-anchor">
          <Anchor className="size-3.5" />
          Web 2.5 — SQL speed, blockchain trust
        </span>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Career credentials you can <span className="text-primary">prove</span>.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          CareerVault lets companies issue cryptographically signed career documents and gives employees a
          lifelong wallet to verify them anywhere — in seconds, without calling HR.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth/register">
              Get started
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <Card key={feature.title} className="p-6 transition-shadow hover:shadow-raised">
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </Card>
          )
        })}
      </section>
    </div>
  )
}

export default Hero
