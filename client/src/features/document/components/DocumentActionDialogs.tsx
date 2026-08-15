import { SelectNative } from '@/components/ui/select-native'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { RevocationCode } from '@/features/document/types'
import type { ActionDialog } from '@/features/document/useDocumentActions'

const REVOCATION_LABEL: Record<RevocationCode, string> = {
  ADMINISTRATIVE_ERROR: 'Administrative error',
  POLICY_VIOLATION: 'Policy violation',
  ISSUED_IN_ERROR: 'Issued in error',
}

type ActionKey = Exclude<ActionDialog, null>

interface DocumentActionDialogsProps {
  dialog: ActionDialog
  onClose: () => void
  reason: string
  onReasonChange: (value: string) => void
  code: RevocationCode
  onCodeChange: (value: RevocationCode) => void
  handlers: Record<ActionKey, () => void>
  loading: Record<ActionKey, boolean>
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
  handlers,
  loading,
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
        isLoading={loading.return}
        onConfirm={handlers.return}
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
        isLoading={loading.reject}
        onConfirm={handlers.reject}
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
        isLoading={loading.approve}
        onConfirm={handlers.approve}
      />

      <ConfirmDialog
        open={dialog === 'revoke'}
        onOpenChange={handleOpenChange}
        title="Revoke this document"
        description="Verification will immediately report this document as revoked. This cannot be undone."
        confirmLabel="Revoke"
        isDestructive
        isLoading={loading.revoke}
        onConfirm={handlers.revoke}
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
        isLoading={loading.delete}
        onConfirm={handlers.delete}
      />
    </>
  )
}
