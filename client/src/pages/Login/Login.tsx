import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { AuthShell } from '@/features/auth/components/AuthShell'
import { useLoginMutation } from '@/features/auth/authApi'
import { setCredentials } from '@/features/auth/authSlice'
import { loginSchema, type LoginValues } from '@/features/auth/schema'
import { useAppDispatch, useAuth } from '@/hooks/useAuth'
import { ROLE_CONFIG, primaryRole } from '@/lib/roles'
import { toastApiError } from '@/lib/notify'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { isAuthenticated } = useAuth()
  const [login, { isLoading }] = useLoginMutation()
  // Where the user was actually headed before the auth gate intercepted them.
  // Without this, deep links and shared filtered list URLs all collapse to the
  // role's home screen after signing in.
  const from = (location.state as { from?: string } | null)?.from ?? null
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    // Validate on blur so a typo surfaces at the field, not after a failed submit.
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  })
  // Prevent the auth-guard effect from overriding the explicit navigation after a
  // successful login. The effect only bounces users who landed here already
  // authenticated (e.g. manually typed /auth/login while signed in).
  const didSubmit = useRef(false)

  useEffect(() => {
    // Covers the session-restore path: AuthRefresh revives the session while the
    // user sits on /auth/login, and they should resume where they were going.
    if (isAuthenticated && !didSubmit.current) navigate(from ?? '/app', { replace: true })
  }, [isAuthenticated, navigate, from])

  const onSubmit = async (values: LoginValues) => {
    try {
      didSubmit.current = true
      const result = await login(values).unwrap()
      dispatch(setCredentials(result))
      navigate(from ?? ROLE_CONFIG[primaryRole(result.user)].home, { replace: true })
    } catch (error) {
      didSubmit.current = false
      toastApiError(error, 'Sign in failed')
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your career wallet."
      footer={
        <p>
          No account?{' '}
          <Link to="/auth/register" className="focus-ring rounded font-medium text-seal hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="you@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="animate-spin" />}
            Sign in
          </Button>
        </form>
      </Form>

      {/* Invited members often have no password yet, so this is a real path — not
          fine print buried in a paragraph. */}
      <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
        <p className="text-label text-muted-foreground">Invited to an organisation and never set a password?</p>
        <Button asChild variant="outline" className="w-full">
          <Link to="/auth/magic">
            <KeyRound />
            Email me a sign-in link
          </Link>
        </Button>
      </div>
    </AuthShell>
  )
}

export default Login
