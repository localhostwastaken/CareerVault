import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Notice } from '@/components/shared/Notice'
import { useGetMyEmployeeKeysQuery } from '@/features/employee-key/api'
import { SecretFields } from '@/features/employee-key/components/SecretFields'
import { emptyStepUp, stepUpSchema, type StepUpValues } from '@/features/employee-key/schema'
import type { EmployeeKeyStatus, StepUp } from '@/features/employee-key/types'

interface StepUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  title: string
  description: string
  confirmLabel: string
  isLoading: boolean
  onConfirm: (stepUp: StepUp) => void
}

function StepUpForm({ status, confirmLabel, isLoading, onConfirm }: { status: EmployeeKeyStatus } & Pick<StepUpDialogProps, 'confirmLabel' | 'isLoading' | 'onConfirm'>) {
  const form = useForm<StepUpValues>({
    resolver: zodResolver(stepUpSchema),
    defaultValues: emptyStepUp(status.questions.map((question) => question.id)),
    mode: 'onBlur',
  })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onConfirm)} noValidate className="flex flex-col gap-5">
        <SecretFields questions={status.questions} />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <KeyRound />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

// The step-up before a signature: the signer re-enters the details their key was derived
// from. Only a match on the server unlocks the key, so a stolen session cannot sign.
export function StepUpDialog({ open, onOpenChange, organizationId, title, description, ...form }: StepUpDialogProps) {
  const { data, isLoading } = useGetMyEmployeeKeysQuery(undefined, { skip: !open })
  const status = data?.find((entry) => entry.organizationId === organizationId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="flex items-center gap-2 text-body text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking your signing key…
          </p>
        ) : status?.isEnrolled ? (
          // Mounted per open, so a cancelled attempt never leaves answers in the fields.
          <StepUpForm status={status} {...form} />
        ) : (
          <Notice
            tone="pending"
            title="Set up your signing security first"
            actions={
              <Button asChild size="sm" variant="outline">
                <Link to="/app/profile">Open profile</Link>
              </Button>
            }
          >
            Signing needs your personal key, made once from your date of birth, an ID and three answers.
          </Notice>
        )}
      </DialogContent>
    </Dialog>
  )
}
