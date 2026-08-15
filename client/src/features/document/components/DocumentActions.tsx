import { Link } from 'react-router-dom'
import { Ban, CheckCircle2, PenLine, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DocumentActionDialogs } from '@/features/document/components/DocumentActionDialogs'
import { useDocumentActions } from '@/features/document/useDocumentActions'
import type { DocumentDetail } from '@/features/document/types'

// Role-aware action bar, driven by the user's ACTIVE persona. Permission gates and
// mutation logic live in useDocumentActions; this renders the buttons that persona is
// allowed to use plus their dialogs.
export function DocumentActions({ document }: { document: DocumentDetail }) {
  const actions = useDocumentActions(document)
  const { permissions } = actions
  if (!permissions.hasAny) return null

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
          <Button variant="secondary" onClick={() => actions.setDialog('reject')}>
            <Undo2 />
            Return
          </Button>
          <Button onClick={() => actions.setDialog('approve')}>
            <CheckCircle2 />
            Approve &amp; issue
          </Button>
        </>
      )}
      {permissions.canReturn && (
        <Button variant="secondary" onClick={() => actions.setDialog('return')}>
          <Undo2 />
          Return
        </Button>
      )}
      {permissions.canRevoke && (
        <Button variant="destructive" onClick={() => actions.setDialog('revoke')}>
          <Ban />
          Revoke
        </Button>
      )}
      {permissions.canDelete && (
        <Button variant="destructive" onClick={() => actions.setDialog('delete')}>
          <Trash2 />
          Delete
        </Button>
      )}

      <DocumentActionDialogs
        dialog={actions.dialog}
        onClose={actions.close}
        reason={actions.reason}
        onReasonChange={actions.setReason}
        code={actions.code}
        onCodeChange={actions.setCode}
        handlers={actions.handlers}
        loading={actions.loading}
      />
    </Card>
  )
}
