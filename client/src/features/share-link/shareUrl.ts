import type { ShareLink } from '@/features/share-link/types'

/** The public verification URL for a share link. The one place this is assembled. */
export function shareLinkUrl(link: Pick<ShareLink, 'urlToken'>): string {
  return `${window.location.origin}/verify/${link.urlToken}`
}
