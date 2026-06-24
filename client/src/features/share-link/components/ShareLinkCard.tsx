import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'
import type { ShareLink } from '@/features/share-link/types'
import { formatDate } from '@/lib/format'

interface ShareLinkCardProps {
  link: ShareLink
  onDeactivate: (id: string) => void
  isDeactivating: boolean
}

export function ShareLinkCard({ link, onDeactivate, isDeactivating }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/verify/${link.urlToken}`

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{DOCUMENT_TYPE_LABEL[link.documentType]}</p>
          <p className="truncate text-sm text-muted-foreground">{link.organizationName}</p>
        </div>
        <Badge variant={link.isActive ? 'verified' : 'neutral'}>{link.isActive ? 'Active' : 'Inactive'}</Badge>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
        <span className="tnum min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{url}</span>
        <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={copy} aria-label="Copy link">
          {copied ? <Check className="size-3.5 text-verified" /> : <Copy className="size-3.5" />}
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="tnum">
          {link.views}
          {link.maxViews ? `/${link.maxViews}` : ''} views ·{' '}
          {link.expiresAt ? `expires ${formatDate(link.expiresAt)}` : 'no expiry'}
        </span>
        {link.isActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-revoked hover:text-revoked"
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
