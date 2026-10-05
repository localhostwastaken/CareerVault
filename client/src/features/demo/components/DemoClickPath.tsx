import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DEMO_STEPS, type DemoStep } from '@/features/demo/demoSteps'
import { useGetSystemStatusQuery } from '@/features/system-status/api'
import { contractTabUrl } from '@/lib/explorer'

function StepLink({ step, contractUrl }: { step: DemoStep; contractUrl: string | null }) {
  if (step.to) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link to={step.to}>
          {step.linkLabel}
          <ArrowRight />
        </Link>
      </Button>
    )
  }
  const href = step.external ? contractTabUrl(contractUrl, step.external) : null
  if (!href) return null
  return (
    <Button asChild variant="outline" size="sm">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink />
        {step.linkLabel}
      </a>
    </Button>
  )
}

export function DemoClickPath() {
  const contractUrl = useGetSystemStatusQuery().data?.blockchain.explorerContractUrl ?? null

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-h2 text-foreground">Click path</h2>
        <p className="mt-0.5 text-body text-muted-foreground">
          One document from request to on-chain proof. Each step links to the screen it happens on, with what the
          system is doing underneath.
        </p>
      </div>
      <ol className="flex flex-col border-t-2 border-rule-strong">
        {DEMO_STEPS.map((step, index) => (
          <li
            key={step.action}
            className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-b border-border py-4 last:border-b-0"
          >
            <span className="tnum text-h2 text-subtle">{String(index + 1).padStart(2, '0')}</span>
            <div className="flex min-w-0 flex-col gap-2">
              <p className="label-micro">
                {step.actor}
                {step.account && <span className="normal-case tracking-normal"> · {step.account}</span>}
              </p>
              <p className="text-body font-medium text-foreground">{step.action}</p>
              <p className="flex gap-2 text-label text-muted-foreground">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-seal" aria-hidden />
                <span>{step.happening}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <StepLink step={step} contractUrl={contractUrl} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}
