import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { AccountTypeField } from '@/features/auth/components/AccountTypeField'
import { AuthShell } from '@/features/auth/components/AuthShell'
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
    mode: 'onBlur',
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
      navigate(values.accountType === 'ORG_ADMIN' ? '/app/org' : ROLE_CONFIG['HOLDER'].home, { replace: true })
    } catch (error) {
      didSubmit.current = false
      const message = apiErrorMessage(error, 'Registration failed')
      notify.error(
        message.toLowerCase().includes('already registered')
          ? 'That email is already registered. Sign in instead — or if you were invited to an organisation, use the passwordless sign-in link.'
          : message,
      )
    }
  }

  return (
    <AuthShell
      title="Create your account"
      description="Start a career record that outlives any employer."
      footer={
        <p>
          Already have an account?{' '}
          <Link to="/auth/login" className="focus-ring rounded font-medium text-seal hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>I’m signing up as</FormLabel>
                <AccountTypeField name={field.name} value={field.value} onChange={field.onChange} />
                <FormMessage />
              </FormItem>
            )}
          />
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
                <FormDescription>At least 8 characters, with upper, lower, and a number.</FormDescription>
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
    </AuthShell>
  )
}

export default Register
