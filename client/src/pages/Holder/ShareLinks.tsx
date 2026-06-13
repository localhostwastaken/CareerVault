import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useDeactivateShareLinkMutation, useListShareLinksQuery } from '@/features/share-link/api'
import { ShareLinkCard } from '@/features/share-link/components/ShareLinkCard'
import { CreateShareLinkDialog } from '@/features/share-link/components/CreateShareLinkDialog'
import { toastApiError } from '@/lib/notify'

const HolderShareLinks = () => {
  const [searchParams] = useSearchParams()
  const presetDoc = searchParams.get('doc')
  const [createOpen, setCreateOpen] = useState(Boolean(presetDoc))
  const { data, isLoading } = useListShareLinksQuery()
  const [deactivate, { isLoading: isDeactivating }] = useDeactivateShareLinkMutation()
  const links = data ?? []

  const onDeactivate = async (id: string) => {
    try {
      await deactivate(id).unwrap()
    } catch (error) {
      toastApiError(error, 'Could not deactivate the link')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Share Links"
        description="Create verifiable, shareable links to your issued documents."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Create link
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : links.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="No share links yet"
          description="Generate a link anyone can use to verify your document — no account required."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              Create link
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <ShareLinkCard key={link.id} link={link} onDeactivate={onDeactivate} isDeactivating={isDeactivating} />
          ))}
        </div>
      )}

      <CreateShareLinkDialog open={createOpen} onOpenChange={setCreateOpen} presetDocumentId={presetDoc} />
    </div>
  )
}

export default HolderShareLinks
