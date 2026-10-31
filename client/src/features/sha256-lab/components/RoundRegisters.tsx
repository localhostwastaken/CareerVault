import { REGISTER_NAMES, toHex32, type RoundStep } from '@/features/sha256-lab/sha256Trace'
import { cn } from '@/lib/utils'

// Only a and e receive newly computed values; the other six registers slide down one place.
const SOURCE: Record<(typeof REGISTER_NAMES)[number], string> = {
  a: 'T1 + T2',
  b: '← a',
  c: '← b',
  d: '← c',
  e: 'd + T1',
  f: '← e',
  g: '← f',
  h: '← g',
}

export function RoundRegisters({ step }: { step: RoundStep }) {
  return (
    <div className="inset-well overflow-x-auto p-3">
      <table className="tnum w-full font-mono text-label">
        <caption className="mb-2 text-left font-sans text-label text-muted-foreground">
          Working registers before and after round {step.t}
        </caption>
        <thead>
          <tr className="label-micro text-left">
            <th scope="col" className="pb-1 pr-3 font-sans">Register</th>
            <th scope="col" className="pb-1 pr-3 font-sans">Before</th>
            <th scope="col" className="pb-1 pr-3 font-sans">After</th>
            <th scope="col" className="pb-1 font-sans">Becomes</th>
          </tr>
        </thead>
        <tbody>
          {REGISTER_NAMES.map((name, index) => {
            const isComputed = name === 'a' || name === 'e'
            return (
              <tr key={name}>
                <th scope="row" className="py-0.5 pr-3 text-left font-sans font-medium text-muted-foreground">
                  {name}
                </th>
                <td className="py-0.5 pr-3 text-muted-foreground">{toHex32(step.before[index])}</td>
                <td className={cn('py-0.5 pr-3', isComputed ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  {toHex32(step.after[index])}
                </td>
                <td className={cn('py-0.5 font-sans', isComputed ? 'font-medium text-seal' : 'text-subtle')}>{SOURCE[name]}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
