import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { PlanCard } from '@/features/subscription/components/PlanCard'
import { useGetMySubscriptionQuery, useGetPlansQuery, useSubscribeMutation } from '@/features/subscription/api'
import type { SubscriptionTier } from '@/features/subscription/types'
import { CreateKeyDialog } from '@/features/verifier-key/components/CreateKeyDialog'
import { VerifierKeyList } from '@/features/verifier-key/components/VerifierKeyList'
import { toastApiError } from '@/lib/notify'

const VERIFIER_TIERS: SubscriptionTier[] = ['VERIFIER_BASIC', 'VERIFIER_ENTERPRISE']

const VerifierApi = () => {
  const navigate = useNavigate()
  const { data: subscription } = useGetMySubscriptionQuery()
  const { data: plans, isLoading } = useGetPlansQuery()
  const [subscribe, { isLoading: isSubscribing }] = useSubscribeMutation()
  const [createOpen, setCreateOpen] = useState(false)

  const isActiveVerifier =
    subscription?.status === 'ACTIVE' && VERIFIER_TIERS.includes(subscription.tier)

  const onSubscribe = async (tier: SubscriptionTier) => {
    try {
      const result = await subscribe(tier).unwrap()
      const url = new URL(result.checkout.checkoutUrl)
      navigate(url.pathname + url.search, { state: { amountDollars: result.checkout.amount } })
    } catch (error) {
      toastApiError(error, 'Could not start checkout')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verifier API"
        description="Subscribe for programmatic bulk verification, then generate API keys to call it."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading plans…</p>
      ) : (
        <div className="grid gap-4 sm:max-w-2xl sm:grid-cols-2">
          {plans
            ?.filter((plan) => VERIFIER_TIERS.includes(plan.tier))
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

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">API keys</h2>
          {isActiveVerifier && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              New key
            </Button>
          )}
        </div>
        {isActiveVerifier ? (
          <VerifierKeyList />
        ) : (
          <p className="text-sm text-muted-foreground">
            Subscribe to a Verifier plan above to create API keys for the Bulk Verification API.
          </p>
        )}
      </Card>

      <CreateKeyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

export default VerifierApi
