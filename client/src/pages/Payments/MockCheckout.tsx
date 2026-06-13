import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CreditCard, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useMockCompletePaymentMutation } from '@/features/payment/api'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/format'
import { notify, toastApiError } from '@/lib/notify'

// Stand-in for the Stripe-hosted checkout (mock driver). The mock adapter points its
// checkout URL here; "Pay" confirms the payment server-side, then returns the user.
const MockCheckout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const session = params.get('session') ?? ''
  const plan = params.get('plan')
  const [complete, { isLoading }] = useMockCompletePaymentMutation()

  // Pay requires a session token; completing it requires auth. Bounce both edge cases.
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />
  if (!session) return <Navigate to="/" replace />

  // Authoritative amount (dollars) is passed via router state; the URL carries cents.
  const stateAmount = (location.state as { amountDollars?: number } | null)?.amountDollars
  const urlAmount = params.get('amount')
  const dollars = stateAmount ?? (urlAmount ? Number(urlAmount) / 100 : null)
  const returnTo = plan ? '/app/billing' : '/app/share-links'
  const summary = plan
    ? `${plan.replace(/_/g, ' ')} subscription`
    : dollars != null && !Number.isNaN(dollars)
      ? formatCurrency(dollars)
      : 'CareerVault payment'

  const pay = async () => {
    try {
      await complete(session).unwrap()
      notify.success('Payment successful.')
      navigate(returnTo, { replace: true })
    } catch (error) {
      toastApiError(error, 'Payment could not be completed')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="mb-6 flex items-center gap-2 font-bold tracking-tight text-foreground">
        <ShieldCheck className="size-5 text-primary" />
        CareerVault
      </div>
      <Card className="w-full max-w-sm p-6 shadow-raised">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CreditCard className="size-4" />
          Secure checkout
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-pending-soft px-2 py-0.5 text-xs font-semibold text-pending">
            Test mode
          </span>
        </div>

        <div className="mt-5 border-y border-border py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">Paying for</p>
          <p className="mt-1 font-semibold capitalize text-foreground">{summary}</p>
        </div>

        <Button className="mt-5 w-full" onClick={pay} disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : <Lock />}
          Pay now
        </Button>
        <button
          type="button"
          onClick={() => navigate(returnTo, { replace: true })}
          className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </Card>
      <p className="mt-4 max-w-xs text-center text-xs text-subtle">
        This is a simulated checkout. No real payment is processed.
      </p>
    </div>
  )
}

export default MockCheckout
