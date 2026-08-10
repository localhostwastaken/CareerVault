import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Lock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { Section } from '@/components/shared/Section'
import { ErrorState } from '@/components/shared/ErrorState'
import { CardGridSkeleton, TableSkeleton } from '@/components/shared/Skeletons'
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
  const subscriptionQuery = useGetMySubscriptionQuery()
  const subscription = subscriptionQuery.data
  const plansQuery = useGetPlansQuery()
  const [subscribe, { isLoading: isSubscribing }] = useSubscribeMutation()
  const [createOpen, setCreateOpen] = useState(false)

  const isActiveVerifier = subscription?.status === 'ACTIVE' && VERIFIER_TIERS.includes(subscription.tier)
  // Absence of a subscription and failure to load one are different facts. Treating
  // them alike told paying subscribers they had no plan whenever the request failed.
  const entitlementUnknown = subscriptionQuery.isLoading || subscriptionQuery.isError

  const onSubscribe = async (tier: SubscriptionTier) => {
    try {
      const result = await subscribe(tier).unwrap()
      const url = new URL(result.checkout.checkoutUrl)
      navigate(url.pathname + url.search, {
        state: { amountDollars: result.checkout.amount },
      })
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
        <QueryBoundary
          query={plansQuery}
          skeleton={<CardGridSkeleton count={2} />}
          errorTitle="Couldn't load plans"
          headingLevel={3}
        >
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
          isActiveVerifier &&
          !entitlementUnknown && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              New key
            </Button>
          )
        }
      >
        {subscriptionQuery.isLoading ? (
          <TableSkeleton rows={3} columns={5} />
        ) : subscriptionQuery.isError ? (
          <ErrorState
            headingLevel={3}
            title="Couldn't check your plan"
            description="We can't tell whether your Verifier subscription is active, so your keys are hidden for now. This does not affect keys already in use."
            error={subscriptionQuery.error}
            onRetry={subscriptionQuery.refetch}
          />
        ) : isActiveVerifier ? (
          <Card className="overflow-hidden p-0">
            <VerifierKeyList />
          </Card>
        ) : (
          // Locked rather than hidden: the user should see what subscribing unlocks.
          <EmptyState
            icon={Lock}
            headingLevel={3}
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
