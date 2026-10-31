import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BitRows } from '@/features/sha256-lab/components/BitRows'
import { RoundRegisters } from '@/features/sha256-lab/components/RoundRegisters'
import { SigmaBreakdown } from '@/features/sha256-lab/components/SigmaBreakdown'
import type { BlockTrace } from '@/features/sha256-lab/sha256Trace'

interface RoundInspectorProps {
  block: BlockTrace
  round: number
  onRoundChange: (round: number) => void
}

// One compression round at the bit level. T1 mixes e, f, g, h with the round constant and the
// schedule word; T2 mixes a, b, c. Stepping through all 64 shows the avalanche happening.
export function RoundInspector({ block, round, onRoundChange }: RoundInspectorProps) {
  const step = block.rounds[round]
  const [a, b, c, , e, f, g, h] = step.before

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" aria-label="Previous round" disabled={round === 0} onClick={() => onRoundChange(round - 1)}>
          <ChevronLeft />
        </Button>
        <label className="flex min-w-48 flex-1 items-center gap-3 text-label text-muted-foreground">
          <span className="tnum w-20 font-medium text-foreground">Round {round}</span>
          <input
            type="range"
            min={0}
            max={63}
            value={round}
            onChange={(event) => onRoundChange(Number(event.target.value))}
            className="focus-ring flex-1 accent-seal"
            aria-label="Round number"
          />
        </label>
        <Button variant="outline" size="icon" aria-label="Next round" disabled={round === 63} onClick={() => onRoundChange(round + 1)}>
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-h3 text-foreground">T1 = h + Σ1(e) + Ch(e, f, g) + K{round} + W{round}</h3>
          <SigmaBreakdown name="Σ1" inputLabel="e" input={e} result={step.bigSigma1} />
          <BitRows
            caption="Ch(e, f, g) = (e ∧ f) ⊕ (¬e ∧ g): where e has a 1, take f's bit; where it has a 0, take g's"
            rows={[
              { label: 'e', word: e },
              { label: 'f', word: f },
              { label: 'g', word: g },
              { label: 'Ch(e, f, g)', word: step.choose, operator: '=', isResult: true },
            ]}
          />
          <BitRows
            rows={[
              { label: 'h', word: h },
              { label: 'Σ1(e)', word: step.bigSigma1, operator: '+' },
              { label: 'Ch(e, f, g)', word: step.choose, operator: '+' },
              { label: `K${round}`, word: step.k, operator: '+' },
              { label: `W${round}`, word: step.w, operator: '+' },
              { label: 'T1', word: step.temp1, operator: '=', isResult: true },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3 text-foreground">T2 = Σ0(a) + Maj(a, b, c)</h3>
          <SigmaBreakdown name="Σ0" inputLabel="a" input={a} result={step.bigSigma0} />
          <BitRows
            caption="Maj(a, b, c) = (a ∧ b) ⊕ (a ∧ c) ⊕ (b ∧ c): each bit is whichever value at least two of a, b, c hold"
            rows={[
              { label: 'a', word: a },
              { label: 'b', word: b },
              { label: 'c', word: c },
              { label: 'Maj(a, b, c)', word: step.majority, operator: '=', isResult: true },
            ]}
          />
          <BitRows
            rows={[
              { label: 'Σ0(a)', word: step.bigSigma0 },
              { label: 'Maj(a, b, c)', word: step.majority, operator: '+' },
              { label: 'T2', word: step.temp2, operator: '=', isResult: true },
            ]}
          />
        </div>
      </div>

      <RoundRegisters step={step} />
    </div>
  )
}
