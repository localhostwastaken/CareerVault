import { Card } from '@/components/ui/card'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { CheckRow } from '@/features/verification/components/CheckRow'
import { VerdictBanner } from '@/features/verification/components/VerdictBanner'
import type { VerificationCheck } from '@/features/verification/types'
import { EXAMPLE_HASH } from '@/features/landing/content'

// A real product artifact, not decoration — the exact evidence rail a visitor gets
// from /verify, with illustrative values so the hero doesn't need a live document.
const SAMPLE_CHECKS: VerificationCheck[] = [
  { key: 'signatures', label: 'Manager & HR signatures', status: 'pass', detail: 'Both role statements verified.' },
  { key: 'hash', label: 'Content hash', status: 'pass', detail: 'Recomputed from stored content.' },
  { key: 'anchor', label: 'Blockchain anchor', status: 'pass', detail: 'Merkle root committed on Polygon.' },
]

export function HeroVerificationSample() {
  return (
    <Card className="w-full max-w-sm p-5" aria-label="Example verification result">
      <p className="label-micro">Example verification</p>
      <div className="mt-3">
        <VerdictBanner verdict="VERIFIED" anchored />
      </div>
      <ol className="mt-4">
        {SAMPLE_CHECKS.map((check, index) => (
          <CheckRow key={check.key} check={check} step={index + 1} />
        ))}
      </ol>
      <div className="mt-4 border-t border-border pt-4">
        <p className="label-micro mb-1.5">Document hash · SHA-256</p>
        <HashDisplay
          value={EXAMPLE_HASH}
          lead={16}
          tail={16}
          label="Copy document hash"
        />
      </div>
    </Card>
  )
}
