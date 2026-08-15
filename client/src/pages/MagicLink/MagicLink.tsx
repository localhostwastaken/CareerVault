import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Loader2, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/features/auth/components/AuthShell'
import { useRequestMagicLinkMutation, useVerifyMagicLinkMutation } from '@/features/auth/authApi'
import { setCredentials } from '@/features/auth/authSlice'
import { useAppDispatch } from '@/hooks/useAuth'
import { ROLE_CONFIG, primaryRole } from '@/lib/roles'
import { toastApiError } from '@/lib/notify'

type Stage = 'request' | 'verifying' | 'sent' | 'expired' | 'set-password'

const MagicLink = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [verify] = useVerifyMagicLinkMutation()
  const [requestLink, { isLoading: isRequesting }] = useRequestMagicLinkMutation()
  // One stage variable instead of four independent booleans — the states are mutually
  // exclusive, and the old shape allowed impossible combinations.
  const [stage, setStage] = useState<Stage>(token ? 'verifying' : 'request')
  const [email, setEmail] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current || !token) return
    ran.current = true
    ;(async () => {
      try {
        const result = await verify({ token }).unwrap()
        dispatch(setCredentials(result))
        // Passwordless users (R9) are prompted to set a password so they can sign
        // in normally next time instead of needing another magic link.
        if (result.user.hasPassword) navigate(ROLE_CONFIG[primaryRole(result.user)].home, { replace: true })
        else setStage('set-password')
      } catch {
        setStage('expired')
      }
    })()
  }, [token, verify, dispatch, navigate])

  const handleRequest = async () => {
    if (!email.trim()) return
    try {
      await requestLink({ email: email.trim() }).unwrap()
      setStage('sent')
    } catch (error) {
      toastApiError(error, 'Could not send the link')
    }
  }

  if (stage === 'verifying') {
    return (
      <AuthShell title="Checking your link" description="This only takes a moment.">
        <div role="status" aria-live="polite" className="flex items-center gap-3 py-6 text-body text-muted-foreground">
          <Loader2 className="size-5 shrink-0 animate-spin" />
          Verifying your sign-in link…
        </div>
      </AuthShell>
    )
  }

  if (stage === 'set-password') {
    return (
      <AuthShell title="You’re signed in" description="One optional step before you continue.">
        <p className="text-body text-muted-foreground">
          Your account has no password yet. Set one now and you can sign in directly next time, without waiting for
          an email.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link to="/app/profile">
              <Lock />
              Set a password
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/app">
              Skip for now
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </AuthShell>
    )
  }

  if (stage === 'sent') {
    return (
      <AuthShell
        title="Check your inbox"
        description="If that address has an account, a sign-in link is on its way."
        footer={
          <button
            type="button"
            onClick={() => setStage('request')}
            className="focus-ring rounded font-medium text-seal hover:underline"
          >
            Use a different email
          </button>
        }
      >
        <div role="status" aria-live="polite" className="flex items-start gap-3">
          <Mail className="mt-0.5 size-5 shrink-0 text-verified" />
          <p className="text-body text-muted-foreground">
            We sent a link to <strong className="font-semibold text-foreground">{email}</strong>. It is single-use and
            expires in 15 minutes.
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Sign in without a password"
      description="We’ll email you a one-time link."
      footer={
        <p>
          <Link to="/auth/login" className="focus-ring rounded font-medium text-seal hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      {stage === 'expired' && (
        <div role="alert" className="mb-5 flex items-start gap-3 rounded-lg border border-revoked/30 bg-revoked-soft p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-revoked" />
          <div>
            <p className="text-label font-semibold text-revoked">That link no longer works</p>
            <p className="mt-1 text-label text-muted-foreground">
              Magic links are single-use and valid for 15 minutes. Request a fresh one below.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="magic-email">Email</Label>
          <Input
            id="magic-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleRequest()}
          />
        </div>
        <Button className="w-full" disabled={!email.trim() || isRequesting} onClick={handleRequest}>
          {isRequesting && <Loader2 className="animate-spin" />}
          Send sign-in link
        </Button>
      </div>
    </AuthShell>
  )
}

export default MagicLink
