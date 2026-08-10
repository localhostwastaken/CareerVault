import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Lock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { Section } from '@/components/shared/Section'
import { CardGridSkeleton } from '@/components/shared/Skeletons'
import { PlanCard } from '@/features/subscription/components/PlanCard'
import { useGetMySubscriptionQuery, useGetPlansQuery, useSubscribeMutation } from '@/features/subscription/api'
import type { SubscriptionTier } from '@/features/subscription/types'
import { CreateKeyDialog } from '@/features/verifier-key/components/CreateKeyDialog'
import { VerifierKeyList } from '@/features/verifier-key/components/VerifierKeyList'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toastApiError } from '@/lib/notify'

const VERIFIER_TIERS: SubscriptionTier[] = ['VERIFIER_BASIC', 'VERIFIER_ENTERPRISE']

const VerifierApi = () => {
  useDocumentTitle('Verifier API')
  const navigate = useNavigate()
  const { data: subscription } = useGetMySubscriptionQuery()
  const plansQuery = useGetPlansQuery()
  const [subscribe, { isLoading: isSubscribing }] = useSubscribeMutation()
  const [createOpen, setCreateOpen] = useState(false)

  const isActiveVerifier = subscription?.status === 'ACTIVE' && VERIFIER_TIERS.includes(subscription.tier)

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
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Career wallet"
        title="Verifier API"
        description="Verify documents programmatically, in bulk, from your own systems."
      />

      <Section title="Plans" description="Pick a tier, then generate the keys that authenticate your calls.">
        <QueryBoundary query={plansQuery} skeleton={<CardGridSkeleton count={2} />} errorTitle="Couldn't load plans">
          {(plans) => (
            <div className="grid gap-4 sm:max-w-2xl sm:grid-cols-2">
              {plans
                .filter((plan) => VERIFIER_TIERS.includes(plan.tier))
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

      <Section
        title="API keys"
        description="Keys are shown once at creation. Store them somewhere safe."
        actions={
          isActiveVerifier && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              New key
            </Button>
          )
        }
      >
        {isActiveVerifier ? (
          <Card className="overflow-hidden p-0">
            <VerifierKeyList />
          </Card>
        ) : (
          // Locked rather than hidden: the user should see what subscribing unlocks.
          <EmptyState
            icon={Lock}
            title="Keys unlock with a Verifier plan"
            description="Subscribe above to create API keys for the Bulk Verification API."
            action={
              <Button variant="outline" disabled>
                <KeyRound />
                New key
              </Button>
            }
          />
        )}
      </Section>

      <CreateKeyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

export default VerifierApi
