import { Card } from '@/components/ui/card'
import { CheckRow } from '@/features/verification/components/CheckRow'
import type { VerificationCheck } from '@/features/verification/types'

// The proof itself: every row is a check the server recomputed.
export function EvidencePanel({ checks }: { checks: VerificationCheck[] }) {
  return (
    <Card className="p-6">
      <h2 className="text-h2 text-foreground">Verification evidence</h2>
      <p className="mt-0.5 text-body text-muted-foreground">
        Every check is recomputed from the stored document; the Merkle root is read from Polygon.
      </p>
      <ol className="mt-3">
        {checks.map((check, index) => (
          <CheckRow key={check.key} check={check} step={index + 1} />
        ))}
      </ol>
    </Card>
  )
}
