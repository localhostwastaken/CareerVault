import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ban, CheckCircle2, PenLine, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SelectNative } from '@/components/ui/select-native'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useApproveDocumentMutation,
  useDeleteDocumentMutation,
  useRejectDocumentMutation,
  useReturnDocumentMutation,
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

type Dialog = null | 'approve' | 'reject' | 'revoke' | 'delete' | 'return'

// Role-aware action bar. Uses the user's ACTIVE persona (from the persona switcher),
// not raw memberships, so a user viewing as HOLDER never sees manager sign/draft
// buttons even if they also hold a manager role at the document's org.
export function DocumentActions({ document }: { document: DocumentDetail }) {
  const { role: activeRole, activeOrgId, user } = useAuth()
  const navigate = useNavigate()
  const [approve, approveState] = useApproveDocumentMutation()
  const [reject, rejectState] = useRejectDocumentMutation()
  const [revoke, revokeState] = useRevokeDocumentMutation()
  const [deleteDocument, deleteState] = useDeleteDocumentMutation()
  const [returnDocument, returnState] = useReturnDocumentMutation()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [reason, setReason] = useState('')
  const [code, setCode] = useState<RevocationCode>('ADMINISTRATIVE_ERROR')

  const close = () => {
    setDialog(null)
    setReason('')
    setCode('ADMINISTRATIVE_ERROR')
  }

  // Org-scoped: the active persona must apply to this document's org. Protects
  // against cross-org action leakage (e.g. ORG_ADMIN at Org A operating on Org B).
  const orgMatch = activeOrgId === document.organizationId
  const isHr = orgMatch && (activeRole === 'HR' || activeRole === 'ORG_ADMIN')
  const isManager = orgMatch && activeRole === 'MANAGER'
  const isHolder = activeRole === 'HOLDER' && user?.id === document.holderId
  const canSign = isManager && (document.status === 'REQUESTED' || document.status === 'DRAFT')
  const canReview = isHr && document.status === 'PENDING_HR'
  const canRevoke = isHr && (document.status === 'ISSUED' || document.status === 'ANCHORED')
  // Holder can delete their own pre-signing or revoked docs.
  const canDelete = isHolder && (document.status === 'REQUESTED' || document.status === 'DRAFT' || document.status === 'REVOKED')
  // Assigned manager can return a request to the holder for revision.
  const canReturn = isManager && (document.status === 'REQUESTED' || document.status === 'DRAFT')

  if (!canSign && !canReview && !canRevoke && !canDelete && !canReturn) return null

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

  const onDelete = async () => {
    try {
      await deleteDocument(document.id).unwrap()
      notify.success('Document deleted.')
      navigate('/app/documents', { replace: true })
    } catch (error) {
      toastApiError(error, 'Could not delete the document')
    }
  }

  const onReturn = async () => {
    if (!reason.trim()) return
    try {
      await returnDocument({ id: document.id, reason: reason.trim() }).unwrap()
      notify.success('Returned to the holder for revision.')
      navigate('/app/inbox', { replace: true })
    } catch (error) {
      toastApiError(error, 'Could not return the document')
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
      {canReturn && (
        <Button variant="secondary" onClick={() => setDialog('return')}>
          <Undo2 />
          Return
        </Button>
      )}
      {canDelete && (
        <Button variant="destructive" onClick={() => setDialog('delete')}>
          <Trash2 />
          Delete
        </Button>
      )}

      <ConfirmDialog
        open={dialog === 'return'}
        onOpenChange={(open) => !open && close()}
        title="Return to holder"
        description="The holder will be notified and can edit the request before resubmitting."
        confirmLabel="Return"
        isLoading={returnState.isLoading}
        onConfirm={onReturn}
      >
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder="Why are you returning this request?"
          className="resize-none"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={(open) => !open && close()}
        title="Delete document"
        description="This permanently removes the document. It cannot be recovered."
        confirmLabel="Delete"
        isDestructive
        isLoading={deleteState.isLoading}
        onConfirm={onDelete}
      />

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
