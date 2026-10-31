import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useEnrollEmployeeKeyMutation, useGetSecurityQuestionsQuery } from '@/features/employee-key/api'
import { SecretFields } from '@/features/employee-key/components/SecretFields'
import { emptyStepUp, enrollFormSchema, type EnrollFormValues } from '@/features/employee-key/schema'
import type { EmployeeKeyStatus } from '@/features/employee-key/types'
import { notify, toastApiError } from '@/lib/notify'

interface EnrollFormProps {
  status: EmployeeKeyStatus
  onDone: () => void
}

// Creates (or replaces) the signer's personal key for one organisation. The details are sent
// once over TLS, stretched into a key on the server and never stored.
export function EnrollForm({ status, onDone }: EnrollFormProps) {
  const { data: questions = [] } = useGetSecurityQuestionsQuery()
  const [enroll, { isLoading }] = useEnrollEmployeeKeyMutation()
  const form = useForm<EnrollFormValues>({
    resolver: zodResolver(enrollFormSchema),
    defaultValues: {
      next: emptyStepUp(),
      current: status.isEnrolled ? emptyStepUp(status.questions.map((question) => question.id)) : undefined,
    },
    mode: 'onBlur',
  })

  const onSubmit = async ({ next, current }: EnrollFormValues) => {
    try {
      await enroll({ organizationId: status.organizationId, ...next, currentStepUp: current }).unwrap()
      notify.success(status.isEnrolled ? 'Signing key replaced.' : 'Signing key set up.')
      onDone()
    } catch (error) {
      toastApiError(error, 'Could not set up your signing key')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        {status.isEnrolled && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-h3 text-foreground">Your current details</legend>
            <SecretFields prefix="current." questions={status.questions} />
          </fieldset>
        )}
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-h3 text-foreground">{status.isEnrolled ? 'New details' : 'Your details'}</legend>
          <p className="text-label text-muted-foreground">
            Pick answers only you know and will remember exactly; case and extra spaces are ignored. You will re-enter
            them every time you sign.
          </p>
          <SecretFields prefix="next." questions={questions} isChoosing />
        </fieldset>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <KeyRound />}
            {status.isEnrolled ? 'Replace signing key' : 'Create signing key'}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
