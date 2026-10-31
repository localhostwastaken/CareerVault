import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BitRows } from '@/features/sha256-lab/components/BitRows'
import { SigmaBreakdown } from '@/features/sha256-lab/components/SigmaBreakdown'
import { toBin32, toHex32, type BlockTrace, type ScheduleWord } from '@/features/sha256-lab/sha256Trace'
import { cn } from '@/lib/utils'

const formula = (word: ScheduleWord) =>
  word.sources ? `σ1(W${word.t - 2}) + W${word.t - 7} + σ0(W${word.t - 15}) + W${word.t - 16}` : 'Copied from the block'

function ScheduleDetail({ word }: { word: ScheduleWord }) {
  const { sources, t } = word
  if (!sources) {
    return <p className="text-body text-muted-foreground">W{t} is word {t} of the padded block, read as-is.</p>
  }
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SigmaBreakdown name="σ1" inputLabel={`W${t - 2}`} input={sources.w2} result={sources.sigma1} />
      <SigmaBreakdown name="σ0" inputLabel={`W${t - 15}`} input={sources.w15} result={sources.sigma0} />
      <BitRows
        caption="Added modulo 2³², so any carry out of bit 31 is dropped"
        rows={[
          { label: `σ1(W${t - 2})`, word: sources.sigma1 },
          { label: `W${t - 7}`, word: sources.w7, operator: '+' },
          { label: `σ0(W${t - 15})`, word: sources.sigma0, operator: '+' },
          { label: `W${t - 16}`, word: sources.w16, operator: '+' },
          { label: `W${t}`, word: word.w, operator: '=', isResult: true },
        ]}
      />
    </div>
  )
}

// The message schedule: the block's 16 words stretched to 64, one per compression round.
export function ScheduleTable({ block }: { block: BlockTrace }) {
  const [selected, setSelected] = useState(16)
  const word = block.schedule[selected]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className="text-label font-medium text-foreground">
          How W{word.t} was made <span className="text-muted-foreground">(choose any row below)</span>
        </p>
        <ScheduleDetail word={word} />
      </div>
      <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-surface-2">
            <TableRow>
              <TableHead>t</TableHead>
              <TableHead>Wₜ (binary)</TableHead>
              <TableHead>Hex</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.schedule.map((entry) => (
              <TableRow key={entry.t} className={cn(entry.t === selected && 'bg-surface-2')}>
                <TableCell className="tnum font-mono">
                  <button
                    type="button"
                    className="focus-ring cursor-pointer rounded-sm text-seal underline-offset-4 hover:underline"
                    aria-pressed={entry.t === selected}
                    onClick={() => setSelected(entry.t)}
                  >
                    {entry.t}
                  </button>
                </TableCell>
                <TableCell className="tnum whitespace-nowrap font-mono text-label">{toBin32(entry.w)}</TableCell>
                <TableCell className="tnum font-mono text-label">{toHex32(entry.w)}</TableCell>
                <TableCell className="whitespace-nowrap text-label text-muted-foreground">{formula(entry)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
