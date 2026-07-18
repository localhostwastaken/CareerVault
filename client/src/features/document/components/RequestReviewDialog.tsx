import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

interface RequestReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isLoading: boolean
  typeLabel: string
  orgName: string
  managerName: string
  note?: string
}

// The review-before-submit step (NN/g, GOV.UK): recap the request in plain language and
// set expectations for what happens next before the holder commits.
export function RequestReviewDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  typeLabel,
  orgName,
  managerName,
  note,
}: RequestReviewDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Review your request"
      description="Confirm the details before we send this to the organization."
      confirmLabel="Send request"
      isLoading={isLoading}
      onConfirm={onConfirm}
    >
      <div className="space-y-4 text-sm">
        <dl className="space-y-2 rounded-lg bg-surface-2 p-3">
          <Row label="Document" value={typeLabel} />
          <Row label="From" value={orgName} />
          <Row label="Signed by" value={managerName} />
          {note && <Row label="Note" value={note} />}
        </dl>
        <div>
          <p className="mb-1 font-medium text-foreground">What happens next</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>The organization is notified of your request.</li>
            <li>A manager drafts and cryptographically signs your document.</li>
            <li>HR reviews, co-signs, and issues it.</li>
            <li>You get a tamper-evident document you can verify and share.</li>
          </ol>
        </div>
      </div>
    </ConfirmDialog>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium text-foreground">{value}</dd>
    </div>
  )
}
