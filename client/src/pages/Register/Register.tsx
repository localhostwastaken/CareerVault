import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useRegisterMutation } from '@/features/auth/authApi'
import { setActivePersona, setCredentials } from '@/features/auth/authSlice'
import { registerSchema, type RegisterValues } from '@/features/auth/schema'
import { useAppDispatch, useAuth } from '@/hooks/useAuth'
import { ROLE_CONFIG } from '@/lib/roles'
import { apiErrorMessage, notify } from '@/lib/notify'

const Register = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isAuthenticated } = useAuth()
  const [registerUser, { isLoading }] = useRegisterMutation()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', accountType: 'HOLDER' },
  })
  // Prevent the auth-guard effect from overriding the explicit navigation after a
  // successful registration. The effect only bounces users who landed here already
  // authenticated (e.g. manually typed /auth/register while signed in).
  const didSubmit = useRef(false)

  useEffect(() => {
    if (isAuthenticated && !didSubmit.current) navigate('/app', { replace: true })
  }, [isAuthenticated, navigate])

  const onSubmit = async (values: RegisterValues) => {
    try {
      didSubmit.current = true
      const result = await registerUser(values).unwrap()
      dispatch(setCredentials(result))
      // Override the default HOLDER persona for ORG_ADMIN registrants so the
      // sidebar shows admin nav before the org is created.
      if (values.accountType === 'ORG_ADMIN') {
        dispatch(setActivePersona({ role: 'ORG_ADMIN', organizationId: null }))
      }
      navigate(
        values.accountType === 'ORG_ADMIN' ? '/app/org' : ROLE_CONFIG['HOLDER'].home,
        { replace: true },
      )
    } catch (error) {
      const msg = apiErrorMessage(error, 'Registration failed')
      if (msg.toLowerCase().includes('already registered')) {
        notify.error(
          'This email is already registered. Please sign in instead. If you were invited to an organization, you may need to use the passwordless sign-in link.',
        )
      } else {
        notify.error(msg)
      }
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-raised">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Start your verifiable career wallet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" placeholder="Jane Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormDescription>At least 8 chars with upper, lower, and a number.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account type</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                        {...field}
                      >
                        <option value="HOLDER">Employee — store & share my documents</option>
                        <option value="ORG_ADMIN">Organization — issue documents</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="animate-spin" />}
                Create account
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/auth/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default Register
