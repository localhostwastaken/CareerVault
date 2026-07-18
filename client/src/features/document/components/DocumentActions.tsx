import { Link } from 'react-router-dom'
import { Ban, CheckCircle2, PenLine, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DocumentActionDialogs } from '@/features/document/components/DocumentActionDialogs'
import { useDocumentActions } from '@/features/document/useDocumentActions'
import type { DocumentDetail } from '@/features/document/types'

// Role-aware action bar. Permission gates and mutation logic live in useDocumentActions;
// this renders the buttons the active persona is allowed to use plus their dialogs.
export function DocumentActions({ document }: { document: DocumentDetail }) {
  const a = useDocumentActions(document)
  const { can } = a
  if (!can.sign && !can.review && !can.revoke && !can.delete && !can.return) return null

  return (
    <Card className="flex flex-wrap items-center gap-2 p-4">
      <span className="mr-auto text-sm font-semibold text-foreground">Actions</span>

      {can.sign && (
        <Button asChild>
          <Link to={`/app/documents/${document.id}/sign`}>
            <PenLine />
            Draft &amp; sign
          </Link>
        </Button>
      )}
      {can.review && (
        <>
          <Button variant="secondary" onClick={() => a.setDialog('reject')}>
            <Undo2 />
            Return
          </Button>
          <Button onClick={() => a.setDialog('approve')}>
            <CheckCircle2 />
            Approve &amp; issue
          </Button>
        </>
      )}
      {can.revoke && (
        <Button variant="destructive" onClick={() => a.setDialog('revoke')}>
          <Ban />
          Revoke
        </Button>
      )}
      {can.return && (
        <Button variant="secondary" onClick={() => a.setDialog('return')}>
          <Undo2 />
          Return
        </Button>
      )}
      {can.delete && (
        <Button variant="destructive" onClick={() => a.setDialog('delete')}>
          <Trash2 />
          Delete
        </Button>
      )}

      <DocumentActionDialogs
        dialog={a.dialog}
        onClose={a.close}
        reason={a.reason}
        onReasonChange={a.setReason}
        code={a.code}
        onCodeChange={a.setCode}
        handlers={a.handlers}
        loading={a.loading}
      />
    </Card>
  )
}
