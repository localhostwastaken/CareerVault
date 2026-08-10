import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { CardGridSkeleton } from '@/components/shared/Skeletons'
import { useDeactivateShareLinkMutation, useListShareLinksQuery } from '@/features/share-link/api'
import { ShareLinkCard } from '@/features/share-link/components/ShareLinkCard'
import { ShareLinkCreated } from '@/features/share-link/components/ShareLinkCreated'
import { CreateShareLinkDialog } from '@/features/share-link/components/CreateShareLinkDialog'
import type { ShareLink } from '@/features/share-link/types'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toastApiError } from '@/lib/notify'

const HolderShareLinks = () => {
  useDocumentTitle('Share links')
  const [searchParams] = useSearchParams()
  const presetDoc = searchParams.get('doc')
  const [createOpen, setCreateOpen] = useState(Boolean(presetDoc))
  const [created, setCreated] = useState<ShareLink | null>(null)
  const query = useListShareLinksQuery()
  const location = useLocation()
  const navigate = useNavigate()

  // Returning from checkout: show the same confirmation the free path gets, then
  // strip the history state so a refresh doesn't resurrect it.
  const paidLink = (location.state as { createdShareLink?: ShareLink } | null)?.createdShareLink
  useEffect(() => {
    if (!paidLink) return
    setCreated(paidLink)
    navigate(location.pathname, { replace: true, state: null })
  }, [paidLink, navigate, location.pathname])

  const [deactivate, { isLoading: isDeactivating }] = useDeactivateShareLinkMutation()

  const onDeactivate = async (id: string) => {
    try {
      await deactivate(id).unwrap()
    } catch (error) {
      toastApiError(error, 'Could not deactivate the link')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Career wallet"
        title="Share links"
        description="Verifiable links to your issued documents — anyone can check them, no account needed."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Create link
          </Button>
        }
      />

      {created && <ShareLinkCreated link={created} onDismiss={() => setCreated(null)} />}

      <QueryBoundary
        query={query}
        skeleton={<CardGridSkeleton count={4} />}
        errorTitle="Couldn't load your share links"
        empty={
          <EmptyState
            icon={Share2}
            title="No share links yet"
            description="Generate a link anyone can use to verify a document — no account required on their side."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus />
                Create link
              </Button>
            }
          />
        }
      >
        {(links) => (
          <div className="grid gap-4 sm:grid-cols-2">
            {links.map((link) => (
              <ShareLinkCard
                key={link.id}
                link={link}
                onDeactivate={onDeactivate}
                isDeactivating={isDeactivating}
              />
            ))}
          </div>
        )}
      </QueryBoundary>

      <CreateShareLinkDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        presetDocumentId={presetDoc}
        onCreated={setCreated}
      />
    </div>
  )
}

export default HolderShareLinks
