import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { Notice } from '@/components/shared/Notice'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { DetailSkeleton } from '@/components/shared/Skeletons'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { setActivePersona } from '@/features/auth/authSlice'
import { useGetDocumentQuery } from '@/features/document/api'
import { SignDocumentForm } from '@/features/document/components/SignDocumentForm'
import { SignedConfirmation } from '@/features/document/components/SignedConfirmation'
import { SigningCeremony } from '@/features/document/components/SigningCeremony'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail } from '@/features/document/types'
import { useAppDispatch, useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const ManagerSignDocument = () => {
  const { id = '' } = useParams()
  const { activeOrgId, user } = useAuth()
  const dispatch = useAppDispatch()
  const query = useGetDocumentQuery(id, { skip: !id })
  const [signed, setSigned] = useState<DocumentDetail | null>(null)
  useDocumentTitle(query.data ? `Sign — ${DOCUMENT_TYPE_LABEL[query.data.type]}` : 'Sign document')

  // Rendered ahead of the query: signing invalidates the document, and the refetched
  // PENDING_HR status would otherwise replace this confirmation with "can't be signed".
  if (signed) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <SignedConfirmation signed={signed} fallbackSignerName={user?.fullName} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link to="/app/inbox">
          <ArrowLeft />
          Back to inbox
        </Link>
      </Button>

      <QueryBoundary
        query={query}
        skeleton={<DetailSkeleton />}
        errorTitle="Couldn't load this request"
        isEmpty={(document) => !document}
        // The PageHeader h1 lives in the success branch, so on these two paths the
        // state component is the page's only heading.
        headingLevel={1}
        empty={
          <EmptyState
            icon={FileWarning}
            headingLevel={1}
            title="Document not found"
            description="It may have been removed, or you don't have access to it."
            action={
              <Button asChild variant="secondary">
                <Link to="/app/inbox">Back to inbox</Link>
              </Button>
            }
          />
        }
      >
        {(document) => {
          // RoleGate already proved the persona is a MANAGER, but not a manager OF THIS
          // ORG — the route param carries no org. Without this a manager at one company
          // could open another company's drafting surface, note and all.
          const isOwnOrg = activeOrgId === document.organizationId
          const canSign = isOwnOrg && (document.status === 'REQUESTED' || document.status === 'DRAFT')
          const note = typeof document.contentJson.note === 'string' ? document.contentJson.note : null
          // A manager at two employers lands here with the wrong persona active surprisingly
          // often — the org comes from the persona, not from the URL. Telling them to "switch"
          // without offering the switch left the work looking simply unavailable.
          const managerHere = user?.memberships.find(
            (m) => m.role === 'MANAGER' && m.organizationId === document.organizationId,
          )

          return (
            <div className="flex flex-col gap-6">
              <PageHeader
                eyebrow={`Draft & sign · ${document.organizationName}`}
                title={DOCUMENT_TYPE_LABEL[document.type]}
                description={
                  canSign
                    ? 'Complete the record, read what you are attesting to, then sign.'
                    : `For ${document.holderName} · ${document.holderEmail}`
                }
                actions={<StatusBadge status={document.status} />}
              />

              {canSign ? (
                // The ceremony rail sits beside the fields on wide screens and above them
                // otherwise — either way it is read before anything is signed.
                <div className="grid gap-8 xl:grid-cols-[18rem_minmax(0,1fr)]">
                  <div className="xl:sticky xl:top-24 xl:self-start">
                    <SigningCeremony document={document} signerName={user?.fullName ?? '—'} note={note} />
                  </div>
                  <Card className="p-6">
                    <SignDocumentForm document={document} onSigned={setSigned} />
                  </Card>
                </div>
              ) : (
                <div className="flex max-w-2xl flex-col gap-6">
                  {note && (
                    <div className="inset-well p-4">
                      <p className="label-micro">What the holder asked for</p>
                      <p className="mt-1.5 text-body text-foreground">{note}</p>
                    </div>
                  )}
                  <Notice
                  tone="neutral"
                  title={isOwnOrg ? 'This document can no longer be signed' : 'This document belongs to another organisation'}
                  actions={
                    !isOwnOrg && managerHere ? (
                      // Deliberately not useSwitchPersona: that redirects to the role's home
                      // screen, which would bounce the manager off the very document they
                      // opened. Switching in place re-renders this page with the form.
                      <Button
                        variant="secondary"
                        onClick={() =>
                          dispatch(
                            setActivePersona({ role: 'MANAGER', organizationId: managerHere.organizationId }),
                          )
                        }
                      >
                        Switch to {document.organizationName}
                      </Button>
                    ) : undefined
                  }
                >
                  {isOwnOrg
                    ? `It is ${document.status.toLowerCase().replace('_', ' ')}. Signing only applies to requested or draft documents.`
                    : managerHere
                      ? `You are signed in as another organisation's persona. Switch to ${document.organizationName} to sign it.`
                      : `Only a manager at ${document.organizationName} can sign it.`}
                  </Notice>
                </div>
              )}
            </div>
          )
        }}
      </QueryBoundary>
    </div>
  )
}

export default ManagerSignDocument
