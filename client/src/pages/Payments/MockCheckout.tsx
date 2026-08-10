import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useMockCompletePaymentMutation } from '@/features/payment/api'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatCurrency } from '@/lib/format'
import { notify, toastApiError } from '@/lib/notify'

// Stand-in for the Stripe-hosted checkout (mock driver). The mock adapter points its
// checkout URL here; "Pay" confirms the payment server-side, then returns the user.
const MockCheckout = () => {
  useDocumentTitle('Checkout')
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
  const hasAmount = dollars != null && !Number.isNaN(dollars)
  const returnTo = plan ? '/app/billing' : '/app/share-links'
  const summary = plan ? `${plan.replace(/_/g, ' ').toLowerCase()} subscription` : 'CareerVault payment'

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-6 flex items-center gap-2 font-serif text-h2 text-foreground">
        <ShieldCheck className="size-5 text-seal" />
        CareerVault
      </div>

      <Card className="w-full max-w-sm p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="label-micro">Secure checkout</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-pending/25 bg-pending-soft px-2 py-0.5 text-micro text-pending">
            Test mode
          </span>
        </div>

        {/* A receipt line: what is being bought, and for how much. */}
        <dl className="mt-5 flex flex-col gap-3 border-y border-border py-5">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-label text-muted-foreground">Item</dt>
            <dd className="text-label font-semibold capitalize text-foreground">{summary}</dd>
          </div>
          {hasAmount && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-label text-muted-foreground">Total</dt>
              <dd className="tnum text-h2 text-foreground">{formatCurrency(dollars)}</dd>
            </div>
          )}
        </dl>

        <Button className="mt-5 w-full" onClick={pay} disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : <Lock />}
          {hasAmount ? `Pay ${formatCurrency(dollars)}` : 'Pay now'}
        </Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => navigate(returnTo, { replace: true })}>
          Cancel
        </Button>
      </Card>

      <p className="mt-4 max-w-xs text-center text-label text-subtle">
        Simulated checkout. No card is charged and no real payment is processed.
      </p>
    </div>
  )
}

export default MockCheckout
