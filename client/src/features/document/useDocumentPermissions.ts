import type { AppRole } from '@/features/auth/types'
import type { DocumentDetail } from '@/features/document/types'

export interface DocumentPermissions {
  canSign: boolean
  canReview: boolean
  canRevoke: boolean
  canDelete: boolean
  canReturn: boolean
  hasAny: boolean
}

interface Actor {
  activeRole: AppRole
  activeOrgId: string | null
  userId: string | undefined
}

/**
 * What the CURRENT PERSONA may do to this document — not what the user's memberships
 * would permit. Someone viewing as HOLDER never sees manager sign/draft buttons even
 * if they also hold a manager role at the document's org.
 *
 * The server authorizes every one of these independently; this is the UX layer.
 */
export function documentPermissions(document: DocumentDetail, actor: Actor): DocumentPermissions {
  // Org-scoped: the active persona must belong to this document's org. Blocks
  // cross-org leakage (e.g. ORG_ADMIN at Org A acting on Org B's document).
  const orgMatch = actor.activeOrgId === document.organizationId
  const isHr = orgMatch && (actor.activeRole === 'HR' || actor.activeRole === 'ORG_ADMIN')
  const isManager = orgMatch && actor.activeRole === 'MANAGER'
  const isHolder = actor.activeRole === 'HOLDER' && actor.userId === document.holderId
  const isDraftable = document.status === 'REQUESTED' || document.status === 'DRAFT'

  const canSign = isManager && isDraftable
  const canReview = isHr && document.status === 'PENDING_HR'
  const canRevoke = isHr && (document.status === 'ISSUED' || document.status === 'ANCHORED')
  // Holders may delete their own pre-signing or already-revoked documents.
  const canDelete = isHolder && (isDraftable || document.status === 'REVOKED')
  // The assigned manager can bounce a request back to the holder for revision.
  const canReturn = isManager && isDraftable

  return {
    canSign,
    canReview,
    canRevoke,
    canDelete,
    canReturn,
    hasAny: canSign || canReview || canRevoke || canDelete || canReturn,
  }
}
