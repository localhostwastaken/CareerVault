import { Link } from 'react-router-dom'
import { ArrowRight, PenLine, Send, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const STEPS = [
  { icon: Send, label: 'Request', body: 'Pick an organisation you worked at and the document you need.' },
  { icon: PenLine, label: 'They sign', body: 'Your manager signs it and HR co-signs before it is issued.' },
  { icon: Share2, label: 'You share', body: 'Send a link anyone can verify — no account needed on their side.' },
]

// Shown only on an empty wallet. A first-run holder has no documents and no idea what
// this product does yet, so the empty state has to teach before it asks.
export function WalletOnboarding() {
  return (
    <Card className="border-seal/20 bg-accent p-6">
      <h2 className="font-serif text-h1 text-foreground">Welcome to your career wallet</h2>
      <p className="mt-1.5 max-w-2xl text-body text-muted-foreground">
        Documents here are signed by their issuer and anchored on a public ledger, so nobody has to take your word
        for them — or call your old employer.
      </p>

      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          return (
            <li key={step.label} className="flex gap-3 rounded-lg border border-border bg-card p-3">
              <span className="tnum flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-micro tracking-normal text-primary-foreground">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-label font-semibold text-foreground">
                  <Icon className="size-3.5 text-seal" />
                  {step.label}
                </p>
                <p className="mt-0.5 text-label text-muted-foreground">{step.body}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <Button asChild className="mt-5">
        <Link to="/app/request">
          Request your first document
          <ArrowRight />
        </Link>
      </Button>
    </Card>
  )
}
