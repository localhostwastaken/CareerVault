import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Plan, SubscriptionTier } from '@/features/subscription/types'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface PlanCardProps {
  plan: Plan
  isCurrent: boolean
  isLoading: boolean
  onSubscribe: (tier: SubscriptionTier) => void
}

export function PlanCard({ plan, isCurrent, isLoading, onSubscribe }: PlanCardProps) {
  return (
    <Card className={cn('flex flex-col p-6', isCurrent && 'border-verified/40 bg-verified-soft')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-h3 text-foreground">{plan.label}</h3>
        {plan.discounted && <Badge variant="verified">50% issuer discount</Badge>}
      </div>

      <p className="mt-3 flex items-baseline gap-2">
        {plan.discounted && (
          <span className="tnum text-label text-subtle line-through">{formatCurrency(plan.basePrice)}</span>
        )}
        <span className="tnum text-h1 font-bold text-foreground">{formatCurrency(plan.price)}</span>
        <span className="text-label text-muted-foreground">/ month</span>
      </p>

      <ul className="mt-5 flex flex-1 flex-col gap-2">
        {plan.perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2 text-body text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-verified" />
            {perk}
          </li>
        ))}
      </ul>

      <Button
        className="mt-6"
        variant={isCurrent ? 'secondary' : 'primary'}
        disabled={isCurrent || isLoading}
        onClick={() => onSubscribe(plan.tier)}
      >
        {isCurrent ? 'Your current plan' : `Subscribe — ${formatCurrency(plan.price)}/mo`}
      </Button>
    </Card>
  )
}
