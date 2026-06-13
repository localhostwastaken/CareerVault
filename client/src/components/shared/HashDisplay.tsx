import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { truncateHash } from '@/lib/format'
import { cn } from '@/lib/utils'

interface HashDisplayProps {
  value: string
  lead?: number
  tail?: number
  className?: string
}

export function HashDisplay({ value, lead, tail, className }: HashDisplayProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy to clipboard"
      className={cn(
        'tnum inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      <span>{truncateHash(value, lead, tail)}</span>
      {copied ? <Check className="size-3.5 text-verified" /> : <Copy className="size-3.5" />}
    </button>
  )
}
