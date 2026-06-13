import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CheckCircle2, PenLine, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SelectNative } from '@/components/ui/select-native'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useApproveDocumentMutation,
  useRejectDocumentMutation,
  useRevokeDocumentMutation,
} from '@/features/document/api'
import type { DocumentDetail, RevocationCode } from '@/features/document/types'
import { useAuth } from '@/hooks/useAuth'
import { notify, toastApiError } from '@/lib/notify'

const REVOCATION_LABEL: Record<RevocationCode, string> = {
  ADMINISTRATIVE_ERROR: 'Administrative error',
  POLICY_VIOLATION: 'Policy violation',
  ISSUED_IN_ERROR: 'Issued in error',
}

type Dialog = null | 'approve' | 'reject' | 'revoke'

// Role-aware action bar. The viewer's role for THIS document's org decides what's
// offered; managers reaching a viewable draft are by definition its signer (R1 scoping).
export function DocumentActions({ document }: { document: DocumentDetail }) {
  const { user } = useAuth()
  const role = user?.memberships.find((m) => m.organizationId === document.organizationId)?.role
  const [approve, approveState] = useApproveDocumentMutation()
  const [reject, rejectState] = useRejectDocumentMutation()
  const [revoke, revokeState] = useRevokeDocumentMutation()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [reason, setReason] = useState('')
  const [code, setCode] = useState<RevocationCode>('ADMINISTRATIVE_ERROR')

  const close = () => {
    setDialog(null)
    setReason('')
    setCode('ADMINISTRATIVE_ERROR')
  }

  const isHr = role === 'HR' || role === 'ORG_ADMIN'
  const canSign = role === 'MANAGER' && (document.status === 'REQUESTED' || document.status === 'DRAFT')
  const canReview = isHr && document.status === 'PENDING_HR'
  const canRevoke = isHr && (document.status === 'ISSUED' || document.status === 'ANCHORED')

  if (!canSign && !canReview && !canRevoke) return null

  const onApprove = async () => {
    try {
      await approve({ id: document.id }).unwrap()
      notify.success('Document issued to the holder.')
      close()
    } catch (error) {
      toastApiError(error, 'Could not approve the document')
    }
  }

  const onReject = async () => {
    if (!reason.trim()) return
    try {
      await reject({ id: document.id, reason: reason.trim() }).unwrap()
      notify.success('Returned to the signer for revision.')
      close()
    } catch (error) {
      toastApiError(error, 'Could not return the document')
    }
  }

  const onRevoke = async () => {
    try {
      await revoke({ id: document.id, code, reason: reason.trim() || undefined }).unwrap()
      notify.success('Document revoked.')
      close()
    } catch (error) {
      toastApiError(error, 'Could not revoke the document')
    }
  }

  return (
    <Card className="flex flex-wrap items-center gap-2 p-4">
      <span className="mr-auto text-sm font-semibold text-foreground">Actions</span>

      {canSign && (
        <Button asChild>
          <Link to={`/app/documents/${document.id}/sign`}>
            <PenLine />
            Draft &amp; sign
          </Link>
        </Button>
      )}
      {canReview && (
        <>
          <Button variant="secondary" onClick={() => setDialog('reject')}>
            <Undo2 />
            Return
          </Button>
          <Button onClick={() => setDialog('approve')}>
            <CheckCircle2 />
            Approve &amp; issue
          </Button>
        </>
      )}
      {canRevoke && (
        <Button variant="destructive" onClick={() => setDialog('revoke')}>
          <Ban />
          Revoke
        </Button>
      )}

      <ConfirmDialog
        open={dialog === 'approve'}
        onOpenChange={(open) => !open && close()}
        title="Approve & issue"
        description="You'll co-sign this document and issue it to the holder. This generates the final PDF."
        confirmLabel="Approve & issue"
        isLoading={approveState.isLoading}
        onConfirm={onApprove}
      />

      <ConfirmDialog
        open={dialog === 'reject'}
        onOpenChange={(open) => !open && close()}
        title="Return for revision"
        description="The signing manager is notified with your reason."
        confirmLabel="Return to signer"
        isLoading={rejectState.isLoading}
        onConfirm={onReject}
      >
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder="What needs changing?"
          className="resize-none"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'revoke'}
        onOpenChange={(open) => !open && close()}
        title="Revoke document"
        description="Verification will immediately show this document as revoked. This cannot be undone."
        confirmLabel="Revoke"
        isDestructive
        isLoading={revokeState.isLoading}
        onConfirm={onRevoke}
      >
        <div className="space-y-3">
          <SelectNative value={code} onChange={(event) => setCode(event.target.value as RevocationCode)}>
            {Object.entries(REVOCATION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Optional note for the holder"
            className="resize-none"
          />
        </div>
      </ConfirmDialog>
    </Card>
  )
}
