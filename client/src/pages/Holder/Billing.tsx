import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { Section } from '@/components/shared/Section'
import { CardGridSkeleton } from '@/components/shared/Skeletons'
import {
  useCancelSubscriptionMutation,
  useGetMySubscriptionQuery,
  useGetPlansQuery,
  useSubscribeMutation,
} from '@/features/subscription/api'
import { PlanCard } from '@/features/subscription/components/PlanCard'
import type { SubscriptionStatus, SubscriptionTier } from '@/features/subscription/types'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
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
  useDocumentTitle('Billing')
  const navigate = useNavigate()
  const { data: subscription } = useGetMySubscriptionQuery()
  const plansQuery = useGetPlansQuery()
  const [subscribe, { isLoading: isSubscribing }] = useSubscribeMutation()
  const [cancel, { isLoading: isCancelling }] = useCancelSubscriptionMutation()
  const [confirmCancel, setConfirmCancel] = useState(false)

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
      setConfirmCancel(false)
      notify.success('Subscription cancelled.')
    } catch (error) {
      toastApiError(error, 'Could not cancel subscription')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Career wallet"
        title="Billing"
        description="Manage your subscription and unlock premium features."
      />

      {subscription && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-verified/30 bg-verified-soft p-5">
          <div className="flex items-center gap-3">
            <BadgeCheck className="size-5 shrink-0 text-verified" />
            <div>
              <p className="flex flex-wrap items-center gap-2 text-label font-semibold capitalize text-foreground">
                {subscription.tier.replace(/_/g, ' ').toLowerCase()}
                <Badge variant={STATUS_VARIANT[subscription.status]}>{subscription.status}</Badge>
              </p>
              <p className="tnum mt-0.5 text-label text-muted-foreground">
                {subscription.currentPeriodEnd ? `Renews ${formatDate(subscription.currentPeriodEnd)}` : 'Active'}
              </p>
            </div>
          </div>
          {subscription.status === 'ACTIVE' && (
            <Button variant="secondary" onClick={() => setConfirmCancel(true)}>
              Cancel plan
            </Button>
          )}
        </Card>
      )}

      <Section title="Plans" description="Upgrade any time. Cancelling keeps access until the period ends.">
        <QueryBoundary
          query={plansQuery}
          skeleton={<CardGridSkeleton count={1} />}
          errorTitle="Couldn't load plans"
          headingLevel={3}
        >
          {(plans) => (
            <div className="grid gap-4 sm:max-w-md">
              {plans
                .filter((plan) => HOLDER_TIERS.includes(plan.tier))
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
        </QueryBoundary>
      </Section>

      {/* Cancelling is destructive and was previously a single unguarded click. */}
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel your subscription?"
        description="You keep premium access until the end of the current billing period, then revert to the free plan."
        confirmLabel="Cancel subscription"
        cancelLabel="Keep plan"
        isDestructive
        isLoading={isCancelling}
        onConfirm={onCancel}
      />
    </div>
  )
}

export default HolderBilling
