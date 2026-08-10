import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ban, CheckCircle2, PenLine, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  useApproveDocumentMutation,
  useDeleteDocumentMutation,
  useRejectDocumentMutation,
  useReturnDocumentMutation,
  useRevokeDocumentMutation,
} from '@/features/document/api'
import { DocumentActionDialogs, type ActionDialog } from '@/features/document/components/DocumentActionDialogs'
import { documentPermissions } from '@/features/document/useDocumentPermissions'
import type { DocumentDetail, RevocationCode } from '@/features/document/types'
import { useAuth } from '@/hooks/useAuth'
import { notify, toastApiError } from '@/lib/notify'

// Role-aware action bar, driven by the user's ACTIVE persona (see documentPermissions).
export function DocumentActions({ document }: { document: DocumentDetail }) {
  const { role: activeRole, activeOrgId, user } = useAuth()
  const navigate = useNavigate()
  const [approve, approveState] = useApproveDocumentMutation()
  const [reject, rejectState] = useRejectDocumentMutation()
  const [revoke, revokeState] = useRevokeDocumentMutation()
  const [deleteDocument, deleteState] = useDeleteDocumentMutation()
  const [returnDocument, returnState] = useReturnDocumentMutation()
  const [dialog, setDialog] = useState<ActionDialog>(null)
  const [reason, setReason] = useState('')
  const [code, setCode] = useState<RevocationCode>('ADMINISTRATIVE_ERROR')

  const permissions = documentPermissions(document, { activeRole, activeOrgId, userId: user?.id })

  const close = () => {
    setDialog(null)
    setReason('')
    setCode('ADMINISTRATIVE_ERROR')
  }

  const run = async (action: () => Promise<unknown>, success: string, failure: string, to?: string) => {
    try {
      await action()
      notify.success(success)
      close()
      if (to) navigate(to, { replace: true })
    } catch (error) {
      toastApiError(error, failure)
    }
  }

  if (!permissions.hasAny) return null

  const onConfirm = {
    approve: () =>
      run(() => approve({ id: document.id }).unwrap(), 'Document issued to the holder.', 'Could not approve the document'),
    reject: () => {
      if (!reason.trim()) return
      void run(
        () => reject({ id: document.id, reason: reason.trim() }).unwrap(),
        'Returned to the signer for revision.',
        'Could not return the document',
      )
    },
    revoke: () =>
      run(
        () => revoke({ id: document.id, code, reason: reason.trim() || undefined }).unwrap(),
        'Document revoked.',
        'Could not revoke the document',
      ),
    delete: () =>
      run(() => deleteDocument(document.id).unwrap(), 'Document deleted.', 'Could not delete the document', '/app/documents'),
    return: () => {
      if (!reason.trim()) return
      void run(
        () => returnDocument({ id: document.id, reason: reason.trim() }).unwrap(),
        'Returned to the holder for revision.',
        'Could not return the document',
        '/app/inbox',
      )
    },
  }

  return (
    <Card className="flex flex-wrap items-center gap-2 p-4">
      <span className="label-micro mr-auto">Actions</span>

      {permissions.canSign && (
        <Button asChild>
          <Link to={`/app/documents/${document.id}/sign`}>
            <PenLine />
            Draft &amp; sign
          </Link>
        </Button>
      )}
      {permissions.canReview && (
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
      {permissions.canReturn && (
        <Button variant="secondary" onClick={() => setDialog('return')}>
          <Undo2 />
          Return
        </Button>
      )}
      {permissions.canRevoke && (
        <Button variant="destructive" onClick={() => setDialog('revoke')}>
          <Ban />
          Revoke
        </Button>
      )}
      {permissions.canDelete && (
        <Button variant="destructive" onClick={() => setDialog('delete')}>
          <Trash2 />
          Delete
        </Button>
      )}

      <DocumentActionDialogs
        dialog={dialog}
        onClose={close}
        reason={reason}
        onReasonChange={setReason}
        code={code}
        onCodeChange={setCode}
        pending={{
          approve: approveState.isLoading,
          reject: rejectState.isLoading,
          revoke: revokeState.isLoading,
          delete: deleteState.isLoading,
          return: returnState.isLoading,
        }}
        onConfirm={onConfirm}
      />
    </Card>
  )
}
