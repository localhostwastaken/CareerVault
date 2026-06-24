import { useNavigate } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  useCancelSubscriptionMutation,
  useGetMySubscriptionQuery,
  useGetPlansQuery,
  useSubscribeMutation,
} from '@/features/subscription/api'
import { PlanCard } from '@/features/subscription/components/PlanCard'
import type { SubscriptionStatus, SubscriptionTier } from '@/features/subscription/types'
import type { BadgeProps } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import { notify, toastApiError } from '@/lib/notify'

// Holder-facing billing only surfaces the holder tier; verifier tiers belong to the
// recruiter/verifier experience.
const HOLDER_TIERS: SubscriptionTier[] = ['HOLDER_PREMIUM']

const STATUS_VARIANT: Record<SubscriptionStatus, NonNullable<BadgeProps['variant']>> = {
  ACTIVE: 'verified',
  PAST_DUE: 'pending',
  CANCELLED: 'revoked',
  EXPIRED: 'expired',
}

const HolderBilling = () => {
  const navigate = useNavigate()
  const { data: subscription } = useGetMySubscriptionQuery()
  const { data: plans, isLoading } = useGetPlansQuery()
  const [subscribe, { isLoading: isSubscribing }] = useSubscribeMutation()
  const [cancel, { isLoading: isCancelling }] = useCancelSubscriptionMutation()

  const onSubscribe = async (tier: SubscriptionTier) => {
    try {
      const result = await subscribe(tier).unwrap()
      const url = new URL(result.checkout.checkoutUrl)
      navigate(url.pathname + url.search, { state: { amountDollars: result.checkout.amount } })
    } catch (error) {
      toastApiError(error, 'Could not start checkout')
    }
  }

  const onCancel = async () => {
    try {
      await cancel().unwrap()
      notify.success('Subscription cancelled.')
    } catch (error) {
      toastApiError(error, 'Could not cancel subscription')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Manage your subscription and unlock premium features." />

      {subscription && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-verified/30 bg-verified-soft/40 p-5">
          <div className="flex items-center gap-3">
            <BadgeCheck className="size-5 text-verified" />
            <div>
              <p className="font-semibold text-foreground">
                {subscription.tier.replace(/_/g, ' ')}{' '}
                <Badge variant={STATUS_VARIANT[subscription.status]}>{subscription.status}</Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                {subscription.currentPeriodEnd
                  ? `Renews ${formatDate(subscription.currentPeriodEnd)}`
                  : 'Active'}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={onCancel} disabled={isCancelling}>
            Cancel plan
          </Button>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading plans…</p>
      ) : (
        <div className="grid gap-4 sm:max-w-md">
          {plans
            ?.filter((plan) => HOLDER_TIERS.includes(plan.tier))
            .map((plan) => (
            <PlanCard
              key={plan.tier}
              plan={plan}
              isCurrent={subscription?.tier === plan.tier && subscription?.status === 'ACTIVE'}
              isLoading={isSubscribing}
              onSubscribe={onSubscribe}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default HolderBilling
