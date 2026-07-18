import { Link } from 'react-router-dom'
import { Callout } from '@/components/shared/Callout'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail, type DocumentType } from '@/features/document/types'

interface RequestAdvisoriesProps {
  noOrgs: boolean
  noManagers: boolean
  duplicate: DocumentDetail | null
  type: DocumentType
}

// The contextual warnings the request form can raise: no verified orgs to choose from,
// an existing open request of this kind, or an org with nobody who can sign yet.
export function RequestAdvisories({ noOrgs, noManagers, duplicate, type }: RequestAdvisoriesProps) {
  return (
    <>
      {noOrgs && (
        <Callout variant="info" title="No verified organizations yet">
          Organizations verify their domain before they can issue documents. Check back once yours has joined.
        </Callout>
      )}
      {duplicate && (
        <Callout variant="warning" title="You already have an open request">
          There's a {DOCUMENT_TYPE_LABEL[type].toLowerCase()} to this organization in progress.{' '}
          <Link className="font-medium underline" to={`/app/documents/${duplicate.id}`}>
            View it
          </Link>{' '}
          or send another below.
        </Callout>
      )}
      {noManagers && (
        <Callout variant="warning" title="No managers at this organization">
          Nobody here can sign documents yet, so this request can't be sent. Try another organization or check back later.
        </Callout>
      )}
    </>
  )
}
