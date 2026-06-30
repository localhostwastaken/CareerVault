import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, KeyRound, Loader2, Lock, Mail, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRequestMagicLinkMutation, useVerifyMagicLinkMutation } from '@/features/auth/authApi'
import { setCredentials } from '@/features/auth/authSlice'
import { useAppDispatch } from '@/hooks/useAuth'
import { ROLE_CONFIG, primaryRole } from '@/lib/roles'
import { toastApiError } from '@/lib/notify'

const MagicLink = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [verify] = useVerifyMagicLinkMutation()
  const [requestLink, { isLoading: isRequesting }] = useRequestMagicLinkMutation()
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [passwordless, setPasswordless] = useState(false)
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
        if (!result.user.hasPassword) {
          setPasswordless(true)
        } else {
          navigate(ROLE_CONFIG[primaryRole(result.user)].home, { replace: true })
        }
      } catch {
        setError('This link is invalid or has expired.')
      }
    })()
  }, [token, verify, dispatch, navigate])

  const handleRequest = async () => {
    if (!email) return
    try {
      await requestLink({ email }).unwrap()
      setSent(true)
    } catch (e) {
      toastApiError(e, 'Could not send link')
    }
  }

  // Token present, still verifying — show spinner.
  if (token && !error && !passwordless) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-raised text-center">
          <CardContent className="py-16">
            <Loader2 className="mx-auto animate-spin text-muted-foreground" size={32} />
            <p className="mt-4 text-muted-foreground">Verifying your sign-in link…</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Passwordless user signed in via magic link — prompt them to set a password
  // so they don't need a magic link every time.
  if (passwordless) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-raised">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-verified" />
              You're signed in
            </CardTitle>
            <CardDescription>
              Your account doesn't have a password yet. Set one now so you can sign in
              without a magic link next time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" asChild>
              <Link to="/app/profile">
                <Lock className="size-4" />
                Set your password
              </Link>
            </Button>
            <Button variant="secondary" className="w-full" asChild>
              <Link to="/app">
                <ArrowRight className="size-4" />
                Skip for now
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-raised">
        <CardHeader>
          <CardTitle>Sign in without a password</CardTitle>
          <CardDescription>
            {sent
              ? 'If that email is registered, a sign-in link has been sent.'
              : 'Enter your email and we\'ll send you a one-time sign-in link.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Link expired or invalid</p>
                <p className="mt-1 text-muted-foreground">
                  Magic links are single-use and valid for 15 minutes. Request a new one below.
                </p>
              </div>
            </div>
          )}

          {sent ? (
            <div className="flex items-center gap-3 rounded-lg border border-verified/30 bg-verified/10 px-4 py-3 text-sm">
              <Mail size={18} className="mt-0.5 shrink-0 text-verified" />
              <div>
                <p className="font-medium text-verified">Check your inbox</p>
                <p className="mt-1 text-muted-foreground">
                  We sent a link to <strong>{email}</strong>. It expires in 15 minutes.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRequest()}
              />
              <Button
                className="w-full"
                disabled={!email || isRequesting}
                onClick={handleRequest}
              >
                {isRequesting && <Loader2 className="animate-spin" />}
                Send sign-in link
              </Button>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/auth/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default MagicLink
