import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, ArrowRight, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SuccessPanel } from '@/components/shared/SuccessPanel'
import { AuthShell } from '@/features/auth/components/AuthShell'
import { useResetPasswordMutation } from '@/features/auth/authApi'
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/schema'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { apiErrorMessage, notify } from '@/lib/notify'

// The server rejects anything shorter, so a truncated link is answered here instead
// of spending a round trip to be told the obvious.
const MIN_TOKEN_LENGTH = 16

const EXPIRY_HINT = 'Reset links are single-use and valid for 15 minutes.'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const hasUsableToken = token.length >= MIN_TOKEN_LENGTH
  const [resetPassword, { isLoading }] = useResetPasswordMutation()
  const [isDone, setIsDone] = useState(false)
  // The failed attempt has to outlive the toast: the user needs the reason still on
  // screen while they decide whether to request a fresh link.
  const [failure, setFailure] = useState<string | null>(null)
  useDocumentTitle(isDone ? 'Password updated' : 'Choose a new password')

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = async (values: ResetPasswordValues) => {
    try {
      await resetPassword({ token, password: values.password }).unwrap()
      setFailure(null)
      setIsDone(true)
    } catch (error) {
      const message = apiErrorMessage(error, 'Could not reset your password')
      notify.error(message)
      setFailure(message)
    }
  }

  // Act III. Sign-in is a separate step after a reset (the token grants no session),
  // so the resolution screen has to hand the user to it explicitly.
  if (isDone) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center px-4 py-12">
        <SuccessPanel
          headingLevel={1}
          title="Password updated"
          description="Your old password and that reset link no longer work."
          actions={
            <Button asChild>
              <Link to="/auth/login">
                Sign in
                <ArrowRight />
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (!hasUsableToken) {
    return (
      <AuthShell
        title="Choose a new password"
        description="This link can’t be used."
        footer={
          <p>
            <Link to="/auth/login" className="focus-ring rounded font-medium text-seal hover:underline">
              Back to sign in
            </Link>
          </p>
        }
      >
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-revoked/30 bg-revoked-soft p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-revoked" />
          <div>
            <p className="text-label font-semibold text-revoked">This reset link is incomplete</p>
            <p className="mt-1 text-label text-muted-foreground">
              It was probably clipped by an email client. {EXPIRY_HINT} Request a fresh one and open it directly.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="mt-5 w-full">
          <Link to="/auth/forgot-password">
            <Mail />
            Send me a new link
          </Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new password"
      description="Then sign in with it — this link won’t work again."
      footer={
        <p>
          <Link to="/auth/login" className="focus-ring rounded font-medium text-seal hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      {failure && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-lg border border-revoked/30 bg-revoked-soft p-3"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-revoked" />
          <div>
            <p className="text-label font-semibold text-revoked">{failure}</p>
            <p className="mt-1 text-label text-muted-foreground">
              {EXPIRY_HINT}{' '}
              <Link to="/auth/forgot-password" className="focus-ring rounded font-medium text-seal hover:underline">
                Request a fresh link
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="animate-spin" />}
            Set new password
          </Button>
        </form>
      </Form>
    </AuthShell>
  )
}

export default ResetPassword
