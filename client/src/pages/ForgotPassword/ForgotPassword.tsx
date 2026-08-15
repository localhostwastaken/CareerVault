import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SuccessPanel } from '@/components/shared/SuccessPanel'
import { AuthShell } from '@/features/auth/components/AuthShell'
import { useForgotPasswordMutation } from '@/features/auth/authApi'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schema'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toastApiError } from '@/lib/notify'

const ForgotPassword = () => {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation()
  // Holds the server's own deliberately generic wording. Showing it verbatim keeps
  // the UI from implying whether that address has an account.
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  useDocumentTitle(sentMessage ? 'Check your inbox' : 'Reset your password')

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      const result = await forgotPassword(values).unwrap()
      setSentMessage(result.message)
    } catch (error) {
      toastApiError(error, 'Could not send the reset link')
    }
  }

  // Act III. The request is the whole interaction, so it ends on a durable panel
  // rather than a toast the user may miss while checking their mail client.
  if (sentMessage) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center px-4 py-12">
        <SuccessPanel
          headingLevel={1}
          title="Check your inbox"
          description={sentMessage}
          summary={[
            { label: 'Link expires', value: '15 minutes after sending' },
            { label: 'Uses', value: 'Single use' },
          ]}
          actions={
            <>
              <Button asChild>
                <Link to="/auth/login">
                  Back to sign in
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSentMessage(null)
                  form.reset()
                }}
              >
                Use a different email
              </Button>
            </>
          }
        />
      </div>
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      description="We’ll email you a link to choose a new one."
      footer={
        <p>
          <Link to="/auth/login" className="focus-ring rounded font-medium text-seal hover:underline">
            Back to sign in
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="animate-spin" />}
            Send reset link
          </Button>
        </form>
      </Form>
    </AuthShell>
  )
}

export default ForgotPassword
