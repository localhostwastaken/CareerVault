import { AlertTriangle, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CheckKind, CheckLine } from '../types.ts'

// The CLI's ✓ / ✗ / ⚠, as icon + word + colour so no reader depends on colour alone.
const KIND: Record<CheckKind, { icon: LucideIcon; color: string; word: string }> = {
  pass: { icon: CheckCircle2, color: 'text-verified', word: 'Passed' },
  fail: { icon: XCircle, color: 'text-revoked', word: 'Failed' },
  warn: { icon: AlertTriangle, color: 'text-pending', word: 'Note' },
}

export function CheckResultRow({ line, isExplained }: { line: CheckLine; isExplained: boolean }) {
  const { icon: Icon, color, word } = KIND[line.kind]

  return (
    <li className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
      <Icon className={cn('mt-0.5 size-5 shrink-0', color)} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-label font-semibold text-foreground">{line.label}</p>
        <p className="break-all text-body text-muted-foreground">{line.detail}</p>
        {isExplained && line.explain.length > 0 && (
          <pre className="inset-well tnum mt-1.5 overflow-x-auto whitespace-pre-wrap break-all p-3 font-mono text-micro text-foreground">
            {line.explain.join('\n')}
          </pre>
        )}
      </div>
      <span className={cn('shrink-0 text-micro', color)}>{word}</span>
    </li>
  )
}
