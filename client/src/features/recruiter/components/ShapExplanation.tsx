import { cn } from '@/lib/utils'
import type { ShapContribution } from '@/features/recruiter/types'

// Human labels for the model's features.
const FEATURE_LABEL: Record<string, string> = {
  embedding_similarity: 'Profile similarity',
  skill_overlap: 'Skill overlap',
  seniority_fit: 'Seniority fit',
  industry_overlap: 'Industry overlap',
  years_exp_fit: 'Experience fit',
  recency: 'Recency',
}

const pct = (value: number) => `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`

interface ShapExplanationProps {
  contributions: ShapContribution[]
  baseValue: number
  matchScore: number
}

// Real per-feature SHAP attributions: bars diverge left (lowers the score) / right
// (raises it), and base + Σcontributions reconcile to the match score.
export function ShapExplanation({ contributions, baseValue, matchScore }: ShapExplanationProps) {
  const maxAbs = Math.max(...contributions.map((c) => Math.abs(c.shap_value)), 0.0001)
  const sorted = [...contributions].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))

  return (
    <div className="space-y-2 rounded-lg bg-surface-2 p-3">
      <p className="text-xs text-muted-foreground">
        Baseline {pct(baseValue)} → match {pct(matchScore)}. What moved the score:
      </p>
      {sorted.map((c) => {
        const positive = c.shap_value >= 0
        const width = `${Math.round((Math.abs(c.shap_value) / maxAbs) * 100)}%`
        return (
          <div key={c.feature} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 text-muted-foreground">
              {FEATURE_LABEL[c.feature] ?? c.feature}
            </span>
            <div className="flex flex-1 items-center">
              <div className="flex w-1/2 justify-end">
                {!positive && <span className="h-2 rounded bg-subtle" style={{ width }} />}
              </div>
              <div className="w-px self-stretch bg-border" />
              <div className="flex w-1/2">
                {positive && <span className="h-2 rounded bg-primary" style={{ width }} />}
              </div>
            </div>
            <span className={cn('tnum w-12 text-right font-medium', positive ? 'text-primary' : 'text-muted-foreground')}>
              {positive ? '+' : ''}
              {c.shap_value.toFixed(2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
