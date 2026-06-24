import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Plan, SubscriptionTier } from '@/features/subscription/types'
import { formatCurrency } from '@/lib/format'

interface PlanCardProps {
  plan: Plan
  isCurrent: boolean
  isLoading: boolean
  onSubscribe: (tier: SubscriptionTier) => void
}

export function PlanCard({ plan, isCurrent, isLoading, onSubscribe }: PlanCardProps) {
  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{plan.label}</h3>
        {plan.discounted && <Badge variant="verified">50% issuer discount</Badge>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        {plan.discounted && (
          <span className="tnum text-sm text-subtle line-through">{formatCurrency(plan.basePrice)}</span>
        )}
        <span className="tnum text-2xl font-bold text-foreground">{formatCurrency(plan.price)}</span>
        <span className="text-sm text-muted-foreground">/ month</span>
      </div>

      <ul className="mt-4 flex-1 space-y-2">
        {plan.perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-verified" />
            {perk}
          </li>
        ))}
      </ul>

      <Button className="mt-6" disabled={isCurrent || isLoading} onClick={() => onSubscribe(plan.tier)}>
        {isCurrent ? 'Current plan' : 'Subscribe'}
      </Button>
    </Card>
  )
}
