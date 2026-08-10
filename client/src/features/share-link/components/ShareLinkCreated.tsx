import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/shared/CopyButton'
import { SuccessPanel } from '@/components/shared/SuccessPanel'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'
import { shareLinkUrl } from '@/features/share-link/shareUrl'
import type { ShareLink } from '@/features/share-link/types'
import { formatDate } from '@/lib/format'

interface ShareLinkCreatedProps {
  link: ShareLink
  onDismiss: () => void
}

// The link IS the deliverable, so the resolution screen hands it over rather than
// closing the dialog and leaving the user to hunt for it in the list.
export function ShareLinkCreated({ link, onDismiss }: ShareLinkCreatedProps) {
  const url = shareLinkUrl(link)

  return (
    <SuccessPanel
      title="Share link ready"
      description="Anyone with this link can verify the document. They don't need a CareerVault account."
      summary={[
        { label: 'Document', value: DOCUMENT_TYPE_LABEL[link.documentType] },
        { label: 'Issued by', value: link.organizationName },
        { label: 'Expires', value: link.expiresAt ? formatDate(link.expiresAt) : 'Never' },
        { label: 'View limit', value: link.maxViews ? `${link.maxViews} views` : 'Unlimited' },
      ]}
      artifact={
        <div className="inset-well flex items-center gap-2 py-1 pl-3 pr-1">
          <span className="tnum min-w-0 flex-1 truncate font-mono text-label text-foreground">{url}</span>
          <CopyButton value={url} label="Copy share link" />
        </div>
      }
      actions={
        <>
          <Button asChild variant="outline">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              Preview what they'll see
            </a>
          </Button>
          <Button variant="ghost" onClick={onDismiss}>
            Done
            <ArrowRight />
          </Button>
          <Link
            to="/app/documents"
            className="focus-ring ml-auto rounded text-label font-medium text-seal hover:underline"
          >
            Back to documents
          </Link>
        </>
      }
    />
  )
}
