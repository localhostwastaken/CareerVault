import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CopyButton } from '@/components/shared/CopyButton'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'
import { shareLinkUrl } from '@/features/share-link/shareUrl'
import type { ShareLink } from '@/features/share-link/types'
import { formatDate } from '@/lib/format'

interface ShareLinkCardProps {
  link: ShareLink
  onDeactivate: (id: string) => void
  isDeactivating: boolean
}

export function ShareLinkCard({ link, onDeactivate, isDeactivating }: ShareLinkCardProps) {
  const url = shareLinkUrl(link)
  const viewsLabel = link.maxViews ? `${link.views} of ${link.maxViews} views` : `${link.views} views`

  return (
    // min-w-0 is load-bearing: as a grid item this card defaults to min-width:auto,
    // so the 70-character share URL below would widen the whole track and never
    // truncate — 612px of content in a 375px viewport.
    <Card className="flex min-w-0 flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-label font-semibold text-foreground">{DOCUMENT_TYPE_LABEL[link.documentType]}</p>
          <p className="truncate text-label text-muted-foreground">{link.organizationName}</p>
        </div>
        <Badge variant={link.isActive ? 'verified' : 'neutral'}>{link.isActive ? 'Active' : 'Inactive'}</Badge>
      </div>

      <div className="inset-well flex min-w-0 items-center gap-2 py-1 pl-3 pr-1">
        <span className="tnum min-w-0 flex-1 truncate font-mono text-micro normal-case tracking-normal text-muted-foreground">
          {url}
        </span>
        <CopyButton value={url} label={`Copy link for ${DOCUMENT_TYPE_LABEL[link.documentType]}`} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="tnum min-w-0 truncate text-label text-muted-foreground">
          {viewsLabel}
          <span className="text-subtle"> · </span>
          {link.expiresAt ? `expires ${formatDate(link.expiresAt)}` : 'no expiry'}
        </span>
        {link.isActive && (
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2 shrink-0 text-revoked hover:bg-revoked-soft hover:text-revoked"
            onClick={() => onDeactivate(link.id)}
            disabled={isDeactivating}
          >
            Deactivate
          </Button>
        )}
      </div>
    </Card>
  )
}
