import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExplorerLinkProps {
  /** Null on chains with no public explorer (local simulator, Hardhat) — renders nothing. */
  href: string | null
  label: string
}

// Only chains with a public block explorer produce a URL (server chain-explorer.ts).
// Rendering null instead of a disabled state keeps the local/dev experience honest —
// there is nothing to link to, not a broken link.
export function ExplorerLink({ href, label }: ExplorerLinkProps) {
  if (!href) return null

  return (
    <Button asChild variant="outline" size="sm">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink />
        {label}
      </a>
    </Button>
  )
}
