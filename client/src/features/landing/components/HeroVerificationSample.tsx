import { Card } from '@/components/ui/card'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { CheckRow } from '@/features/verification/components/CheckRow'
import { VerdictBanner } from '@/features/verification/components/VerdictBanner'
import type { VerificationCheck } from '@/features/verification/types'
import { EXAMPLE_DOCUMENT_ID } from '@/features/landing/content'

// A real product artifact, not decoration — the exact evidence rail a visitor gets
// from /verify, with illustrative values so the hero doesn't need a live document.
const SAMPLE_CHECKS: VerificationCheck[] = [
  { key: 'integrity', label: 'Content unchanged since signing', status: 'pass', detail: 'Rebuilt from the encrypted record.' },
  { key: 'managerSignature', label: 'Manager signature', status: 'pass', detail: 'Sealed with the manager’s own key.' },
  { key: 'hrSignature', label: 'HR co-signature', status: 'pass', detail: 'Sealed with HR’s own key.' },
]

export function HeroVerificationSample() {
  return (
    <Card className="w-full max-w-sm p-5" aria-label="Example verification result">
      <p className="label-micro">Example verification</p>
      <div className="mt-3">
        <VerdictBanner verdict="VERIFIED" />
      </div>
      <ol className="mt-4">
        {SAMPLE_CHECKS.map((check, index) => (
          <CheckRow key={check.key} check={check} step={index + 1} />
        ))}
      </ol>
      <div className="mt-4 border-t border-border pt-4">
        <p className="label-micro mb-1.5">Document ID</p>
        <HashDisplay value={EXAMPLE_DOCUMENT_ID} lead={36} tail={0} label="Copy document ID" />
      </div>
    </Card>
  )
}
