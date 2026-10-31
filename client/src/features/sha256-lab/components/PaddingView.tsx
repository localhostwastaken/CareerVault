import type { BlockTrace, Sha256Trace } from '@/features/sha256-lab/sha256Trace'
import { cn } from '@/lib/utils'

type BitKind = 'message' | 'one' | 'zero' | 'length'

const KIND_CLASS: Record<BitKind, string> = {
  message: 'text-foreground',
  one: 'font-semibold text-seal underline underline-offset-4',
  zero: 'text-subtle',
  length: 'bg-surface-2 text-muted-foreground',
}

const LEGEND: Array<{ kind: BitKind; label: string }> = [
  { kind: 'message', label: 'Message bits' },
  { kind: 'one', label: 'The single 1 bit' },
  { kind: 'zero', label: 'Zero padding' },
  { kind: 'length', label: '64-bit message length' },
]

function kindAt(index: number, trace: Sha256Trace): BitKind {
  if (index < trace.messageBits) return 'message'
  if (index === trace.messageBits) return 'one'
  return index < trace.paddedBits.length - 64 ? 'zero' : 'length'
}

// Consecutive bits of one kind collapse into a single span, so a 512-bit block renders as a
// handful of runs instead of 512 elements.
function runs(bits: string, offset: number, trace: Sha256Trace): Array<{ text: string; kind: BitKind }> {
  const out: Array<{ text: string; kind: BitKind }> = []
  for (let i = 0; i < bits.length; i++) {
    const kind = kindAt(offset + i, trace)
    const last = out[out.length - 1]
    if (last?.kind === kind) last.text += bits[i]
    else out.push({ text: bits[i], kind })
  }
  return out
}

export function PaddingView({ trace, block }: { trace: Sha256Trace; block: BlockTrace }) {
  const total = trace.paddedBits.length
  return (
    <div className="flex flex-col gap-4">
      <p className="tnum text-body text-muted-foreground">
        L = {trace.messageBits} message bits, then one 1 bit, then k = {trace.zeroBits} zeros, then L as a 64-bit
        number: {trace.messageBits} + 1 + {trace.zeroBits} + 64 = {total} bits = {total / 512} block
        {total > 512 ? 's' : ''} of 512.
      </p>

      {trace.bytes.length > 0 && (
        <ol className="flex flex-wrap gap-2" aria-label="Message bytes">
          {trace.bytes.map((byte, index) => (
            <li key={index} className="inset-well tnum flex flex-col items-center px-2 py-1 font-mono text-micro">
              <span className="text-foreground">{byte.toString(16).padStart(2, '0')}</span>
              <span className="text-muted-foreground">{byte.toString(2).padStart(8, '0')}</span>
            </li>
          ))}
        </ol>
      )}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label text-muted-foreground">
        {LEGEND.map(({ kind, label }) => (
          <li key={kind} className="flex items-center gap-1.5">
            <span className={cn('tnum px-1 font-mono', KIND_CLASS[kind])}>{kind === 'zero' ? '0' : '1'}</span>
            {label}
          </li>
        ))}
      </ul>

      <div className="inset-well overflow-x-auto p-3">
        <table className="tnum font-mono text-label">
          <caption className="mb-2 text-left font-sans text-label text-muted-foreground">
            Block {block.index + 1} split into sixteen 32-bit words, W₀ to W₁₅
          </caption>
          <tbody>
            {Array.from({ length: 16 }, (_, row) => {
              const offset = block.index * 512 + row * 32
              return (
                <tr key={row}>
                  <th scope="row" className="py-0.5 pr-3 text-left font-sans font-medium text-muted-foreground">
                    W{row}
                  </th>
                  <td className="whitespace-nowrap py-0.5 tracking-wide">
                    {runs(block.bits.slice(row * 32, row * 32 + 32), offset, trace).map((run, index) => (
                      <span key={index} className={KIND_CLASS[run.kind]}>
                        {run.text}
                      </span>
                    ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
