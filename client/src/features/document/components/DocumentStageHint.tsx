import { Explainer } from '@/components/shared/Explainer'
import { APPROVAL_STEPS, REQUEST_STEPS, SIGNING_STEPS } from '@/features/document/explainers'
import type { DocumentDetail } from '@/features/document/types'
import { useDocumentFraming } from '@/features/document/useDocumentFraming'
import { useAuth } from '@/hooks/useAuth'

// Before issuance, the useful hint depends on who is looking: the holder wants to know
// what happens to their request, the manager what signing does, HR what approving does.
// After issuance the authenticity and on-chain cards carry their own hints.
export function DocumentStageHint({ document }: { document: DocumentDetail }) {
  const framing = useDocumentFraming(document)
  const { role } = useAuth()
  const awaitingManager = document.status === 'REQUESTED' || document.status === 'DRAFT'

  if (document.status === 'PENDING_HR' && framing.isIssuerActor && role === 'HR') {
    return (
      <Explainer
        title="What approving does"
        summary="Your co-signature is the second of two. It issues the document and makes it verifiable."
        steps={APPROVAL_STEPS}
        isOpen
      />
    )
  }
  if (awaitingManager && framing.isAttestationContext) {
    return (
      <Explainer
        title="What signing does"
        summary="Five steps between the fields you fill in and a sealed, signed record."
        steps={SIGNING_STEPS}
      />
    )
  }
  if ((awaitingManager || document.status === 'PENDING_HR') && framing.isHolder) {
    return (
      <Explainer
        title="What happens to your request"
        summary="Two people at the organisation sign before it reaches your wallet."
        steps={REQUEST_STEPS}
      />
    )
  }
  return null
}
