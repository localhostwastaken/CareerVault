import { useAuth } from '@/hooks/useAuth'
import type { DocumentDetail } from './types'

export type ViewerKind = 'holder' | 'issuer-actor' | 'recruiter' | 'neutral'

export interface DocumentFraming {
  viewerKind: ViewerKind
  isHolder: boolean
  isIssuerActor: boolean // manager/HR/admin acting for the issuing org
  isRecruiter: boolean
  isAttestationContext: boolean // a signer drafting/signing (manager or org admin)
  showHolderEmail: boolean
  emphasize: 'holder' | 'issuer' // which party a summary/card should lead with
}

// Decides how a document should be framed for the current viewer. Uses the SAME
// org-match gate as DocumentActions so we never label off a persona that doesn't
// apply to this document's org. The holder's own document always frames holder-side,
// even if they also hold an org role at the issuer.
export function useDocumentFraming(doc: DocumentDetail): DocumentFraming {
  const { role, activeOrgId, user } = useAuth()
  const orgMatch = activeOrgId === doc.organizationId
  const isHolderOfDoc = user?.id === doc.holderId

  let viewerKind: ViewerKind = 'neutral'
  if (isHolderOfDoc) viewerKind = 'holder'
  else if (orgMatch && (role === 'MANAGER' || role === 'HR' || role === 'ORG_ADMIN')) viewerKind = 'issuer-actor'
  else if (orgMatch && role === 'RECRUITER') viewerKind = 'recruiter'

  const isIssuerActor = viewerKind === 'issuer-actor'
  return {
    viewerKind,
    isHolder: viewerKind === 'holder',
    isIssuerActor,
    isRecruiter: viewerKind === 'recruiter',
    // Only a signer (manager/admin) attests; HR co-signs but doesn't draft the claims.
    isAttestationContext: isIssuerActor && (role === 'MANAGER' || role === 'ORG_ADMIN'),
    showHolderEmail: viewerKind === 'holder' || isIssuerActor,
    emphasize: viewerKind === 'holder' ? 'issuer' : 'holder',
  }
}
