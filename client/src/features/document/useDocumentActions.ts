import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export type ActionDialog = null | 'approve' | 'reject' | 'revoke' | 'delete' | 'return'

// State + mutations behind the document action bar, kept in one place so the bar and its
// dialogs stay thin. Uses the active persona's org (not raw memberships) and mirrors the
// server's role gates, so a user acting as HOLDER never sees manager/HR actions.
export function useDocumentActions(document: DocumentDetail) {
  const { role, activeOrgId, user } = useAuth()
  const navigate = useNavigate()
  const [approve, approveState] = useApproveDocumentMutation()
  const [reject, rejectState] = useRejectDocumentMutation()
  const [revoke, revokeState] = useRevokeDocumentMutation()
  const [remove, removeState] = useDeleteDocumentMutation()
  const [returnDoc, returnState] = useReturnDocumentMutation()
  const [dialog, setDialog] = useState<ActionDialog>(null)
  const [reason, setReason] = useState('')
  const [code, setCode] = useState<RevocationCode>('ADMINISTRATIVE_ERROR')

  const close = () => {
    setDialog(null)
    setReason('')
    setCode('ADMINISTRATIVE_ERROR')
  }

  const orgMatch = activeOrgId === document.organizationId
  const isHr = orgMatch && (role === 'HR' || role === 'ORG_ADMIN')
  const isManager = orgMatch && role === 'MANAGER'
  const isHolder = role === 'HOLDER' && user?.id === document.holderId
  const s = document.status
  const can = {
    sign: isManager && (s === 'REQUESTED' || s === 'DRAFT'),
    review: isHr && s === 'PENDING_HR',
    revoke: isHr && (s === 'ISSUED' || s === 'ANCHORED'),
    delete: isHolder && (s === 'REQUESTED' || s === 'DRAFT' || s === 'REVOKED'),
    return: isManager && (s === 'REQUESTED' || s === 'DRAFT'),
  }

  const run = async (op: Promise<unknown>, ok: string, fail: string, after?: () => void) => {
    try {
      await op
      notify.success(ok)
      ;(after ?? close)()
    } catch (error) {
      toastApiError(error, fail)
    }
  }

  const id = document.id
  const handlers = {
    approve: () => run(approve({ id }).unwrap(), 'Document issued to the holder.', 'Could not approve the document'),
    reject: () => reason.trim() && run(reject({ id, reason: reason.trim() }).unwrap(), 'Returned to the signer for revision.', 'Could not return the document'),
    revoke: () => run(revoke({ id, code, reason: reason.trim() || undefined }).unwrap(), 'Document revoked.', 'Could not revoke the document'),
    delete: () => run(remove(id).unwrap(), 'Document deleted.', 'Could not delete the document', () => navigate('/app/documents', { replace: true })),
    return: () => reason.trim() && run(returnDoc({ id, reason: reason.trim() }).unwrap(), 'Returned to the holder for revision.', 'Could not return the document', () => navigate('/app/inbox', { replace: true })),
  }

  const loading = {
    approve: approveState.isLoading,
    reject: rejectState.isLoading,
    revoke: revokeState.isLoading,
    delete: removeState.isLoading,
    return: returnState.isLoading,
  }

  return { can, dialog, setDialog, close, reason, setReason, code, setCode, handlers, loading }
}
