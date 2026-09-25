import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AttestationPanel } from '@/components/shared/AttestationPanel'
import { Stepper } from '@/components/shared/Stepper'
import { MILESTONES } from '@/features/document/documentProgress'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail } from '@/features/document/types'

interface SignedConfirmationProps {
  /** The sign mutation's response — the record as the server stored it. */
  signed: DocumentDetail
  fallbackSignerName?: string
}

// Act III of the signing ceremony: the record now carries a manager signature and a
// reference number, and the rail shows the two steps it still needs.
export function SignedConfirmation({ signed, fallbackSignerName }: SignedConfirmationProps) {
  const reference = signed.contentJson?.referenceNumber

  return (
    <AttestationPanel
      title="Signed and sent to HR"
      description={`Your signature is bound to this content. ${signed.organizationName} HR will review and co-sign before it is issued.`}
      record={`${DOCUMENT_TYPE_LABEL[signed.type]} for ${signed.holderName}`}
      reference={typeof reference === 'string' ? reference : undefined}
      signerLabel="Signed by"
      signerName={signed.signerName ?? fallbackSignerName ?? '—'}
      recordedAt={signed.updatedAt}
      nextStep="HR co-signature"
      progress={<Stepper steps={MILESTONES} current={2} />}
      actions={
        <>
          <Button asChild>
            <Link to={`/app/documents/${signed.id}`}>
              View document
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/app/inbox">Back to inbox</Link>
          </Button>
        </>
      }
    />
  )
}
