import { toBin32, toHex32 } from '@/features/sha256-lab/sha256Trace'
import { cn } from '@/lib/utils'

export interface BitRow {
  label: string
  word: number
  /** Operator shown before the row, e.g. ⊕ or +. */
  operator?: string
  /** Draws the rule above the row: the line under a sum or an XOR. */
  isResult?: boolean
}

const byteGroups = (word: number) => toBin32(word).match(/.{8}/g)?.join(' ') ?? ''

// 32-bit words stacked so each bit column lines up, which is the whole point: an XOR or a
// rotation is only visible when the same bit position sits in the same column on every row.
export function BitRows({ rows, caption }: { rows: BitRow[]; caption?: string }) {
  return (
    <div className="inset-well overflow-x-auto p-3">
      <table className="tnum font-mono text-label">
        {caption && <caption className="mb-2 text-left font-sans text-label text-muted-foreground">{caption}</caption>}
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={cn(row.isResult && 'border-t border-rule-strong')}>
              <th scope="row" className="whitespace-nowrap py-0.5 pr-3 text-left font-sans text-label font-medium text-muted-foreground">
                {row.label}
              </th>
              <td className="w-4 py-0.5 text-center text-subtle">{row.operator}</td>
              <td className={cn('whitespace-nowrap py-0.5 pr-4', row.isResult ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {byteGroups(row.word)}
              </td>
              <td className="py-0.5 text-subtle">{toHex32(row.word)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
