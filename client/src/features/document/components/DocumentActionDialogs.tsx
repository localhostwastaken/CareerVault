import { SelectNative } from '@/components/ui/select-native'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { RevocationCode } from '@/features/document/types'

export type ActionDialog = null | 'approve' | 'reject' | 'revoke' | 'delete' | 'return'

const REVOCATION_LABEL: Record<RevocationCode, string> = {
  ADMINISTRATIVE_ERROR: 'Administrative error',
  POLICY_VIOLATION: 'Policy violation',
  ISSUED_IN_ERROR: 'Issued in error',
}

interface DocumentActionDialogsProps {
  dialog: ActionDialog
  onClose: () => void
  reason: string
  onReasonChange: (value: string) => void
  code: RevocationCode
  onCodeChange: (value: RevocationCode) => void
  pending: Record<Exclude<ActionDialog, null>, boolean>
  onConfirm: Record<Exclude<ActionDialog, null>, () => void>
}

// Presentational half of the action bar. Split out so DocumentActions stays under
// the component cap and the confirmation copy is reviewable in one place.
export function DocumentActionDialogs({
  dialog,
  onClose,
  reason,
  onReasonChange,
  code,
  onCodeChange,
  pending,
  onConfirm,
}: DocumentActionDialogsProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose()
  }

  return (
    <>
      <ConfirmDialog
        open={dialog === 'return'}
        onOpenChange={handleOpenChange}
        title="Return to holder"
        description="The holder is notified and can edit the request before resubmitting."
        confirmLabel="Return request"
        isLoading={pending.return}
        onConfirm={onConfirm.return}
      >
        <Textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          rows={3}
          placeholder="Why are you returning this request?"
          className="resize-none"
          aria-label="Reason for returning"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'reject'}
        onOpenChange={handleOpenChange}
        title="Return for revision"
        description="The signing manager is notified with your reason."
        confirmLabel="Return to signer"
        isLoading={pending.reject}
        onConfirm={onConfirm.reject}
      >
        <Textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          rows={3}
          placeholder="What needs changing?"
          className="resize-none"
          aria-label="What needs changing"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'approve'}
        onOpenChange={handleOpenChange}
        title="Approve and issue"
        description="You co-sign this document and issue it to the holder. This generates the final PDF and cannot be undone."
        confirmLabel="Approve & issue"
        isLoading={pending.approve}
        onConfirm={onConfirm.approve}
      />

      <ConfirmDialog
        open={dialog === 'revoke'}
        onOpenChange={handleOpenChange}
        title="Revoke this document"
        description="Verification will immediately report this document as revoked. This cannot be undone."
        confirmLabel="Revoke"
        isDestructive
        isLoading={pending.revoke}
        onConfirm={onConfirm.revoke}
      >
        <div className="flex flex-col gap-3">
          <SelectNative
            value={code}
            onChange={(event) => onCodeChange(event.target.value as RevocationCode)}
            aria-label="Revocation reason"
          >
            {Object.entries(REVOCATION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
          <Textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={3}
            placeholder="Optional note for the holder"
            className="resize-none"
            aria-label="Note for the holder"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={handleOpenChange}
        title="Delete this document"
        description="This permanently removes the document. It cannot be recovered."
        confirmLabel="Delete"
        isDestructive
        isLoading={pending.delete}
        onConfirm={onConfirm.delete}
      />
    </>
  )
}
