import { Link } from 'react-router-dom'
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
import { useAppDispatch } from '@/hooks/useAuth'
import { toastApiError } from '@/lib/notify'

const Login = () => {
  const dispatch = useAppDispatch()
  const [login, { isLoading }] = useLoginMutation()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    // Validate on blur so a typo surfaces at the field, not after a failed submit.
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  })

  // No navigation here: storing credentials flips auth status to 'authenticated' and the
  // GuestOnly wrapper on this route sends the user on — either to the deep link the auth
  // gate intercepted, or to /app, whose index resolves their persona's home screen.
  const onSubmit = async (values: LoginValues) => {
    try {
      dispatch(setCredentials(await login(values).unwrap()))
    } catch (error) {
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
                {/* Beside the field it belongs to: a user who mistypes their password
                    looks here, not at the bottom of the card. */}
                <div className="flex items-center justify-between gap-3">
                  <FormLabel>Password</FormLabel>
                  <Link
                    to="/auth/forgot-password"
                    className="focus-ring rounded text-label font-medium leading-none text-seal hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
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
