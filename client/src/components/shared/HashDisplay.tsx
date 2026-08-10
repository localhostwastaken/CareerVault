import { CopyButton } from '@/components/shared/CopyButton'
import { truncateHash } from '@/lib/format'
import { cn } from '@/lib/utils'

interface HashDisplayProps {
  value: string
  lead?: number
  tail?: number
  /** Screen-reader name for the copy action, e.g. "Copy Merkle root". */
  label?: string
  className?: string
}

// Identifiers render in IBM Plex Mono with tabular numerals so digits align
// column-to-column — a hash should look like a hash.
export function HashDisplay({ value, lead, tail, label = 'Copy to clipboard', className }: HashDisplayProps) {
  return (
    <span
      className={cn(
        'inset-well tnum inline-flex items-center gap-1.5 py-1 pl-2 pr-1 font-mono text-micro normal-case tracking-normal text-muted-foreground',
        className,
      )}
    >
      <span className="min-w-0 truncate" title={value}>
        {truncateHash(value, lead, tail)}
      </span>
      <CopyButton value={value} label={label} className="size-6" />
    </span>
  )
}
