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

type ActionKey = 'approve' | 'reject' | 'revoke' | 'delete' | 'return'

interface DocumentActionDialogsProps {
  dialog: ActionDialog
  onClose: () => void
  reason: string
  onReasonChange: (value: string) => void
  code: RevocationCode
  onCodeChange: (code: RevocationCode) => void
  handlers: Record<ActionKey, () => void>
  loading: Record<ActionKey, boolean>
}

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
  const onOpenChange = (open: boolean) => {
    if (!open) onClose()
  }
  return (
    <>
      <ConfirmDialog open={dialog === 'return'} onOpenChange={onOpenChange} title="Return to holder" description="The holder will be notified and can edit the request before resubmitting." confirmLabel="Return" isLoading={loading.return} onConfirm={handlers.return}>
        <Textarea value={reason} onChange={(e) => onReasonChange(e.target.value)} rows={3} placeholder="Why are you returning this request?" className="resize-none" />
      </ConfirmDialog>

      <ConfirmDialog open={dialog === 'delete'} onOpenChange={onOpenChange} title="Delete document" description="This permanently removes the document. It cannot be recovered." confirmLabel="Delete" isDestructive isLoading={loading.delete} onConfirm={handlers.delete} />

      <ConfirmDialog open={dialog === 'approve'} onOpenChange={onOpenChange} title="Approve & issue" description="You'll co-sign this document and issue it to the holder. This generates the final PDF." confirmLabel="Approve & issue" isLoading={loading.approve} onConfirm={handlers.approve} />

      <ConfirmDialog open={dialog === 'reject'} onOpenChange={onOpenChange} title="Return for revision" description="The signing manager is notified with your reason." confirmLabel="Return to signer" isLoading={loading.reject} onConfirm={handlers.reject}>
        <Textarea value={reason} onChange={(e) => onReasonChange(e.target.value)} rows={3} placeholder="What needs changing?" className="resize-none" />
      </ConfirmDialog>

      <ConfirmDialog open={dialog === 'revoke'} onOpenChange={onOpenChange} title="Revoke document" description="Verification will immediately show this document as revoked. This cannot be undone." confirmLabel="Revoke" isDestructive isLoading={loading.revoke} onConfirm={handlers.revoke}>
        <div className="space-y-3">
          <SelectNative value={code} onChange={(e) => onCodeChange(e.target.value as RevocationCode)}>
            {Object.entries(REVOCATION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
          <Textarea value={reason} onChange={(e) => onReasonChange(e.target.value)} rows={3} placeholder="Optional note for the holder" className="resize-none" />
        </div>
      </ConfirmDialog>
    </>
  )
}
