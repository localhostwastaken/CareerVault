import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
  value: string
  /** Announced to screen readers, e.g. "Copy document hash". */
  label: string
  className?: string
}

// Single clipboard implementation. HashDisplay and ShareLinkCard each had their own
// copy of this timer/state dance.
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard is unavailable over plain HTTP and in some embedded webviews.
      // Selecting the text manually still works, so fail quietly.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} — copied` : label}
      className={cn(
        'focus-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground',
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-verified" /> : <Copy className="size-3.5" />}
    </button>
  )
}
