import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckRow } from '@/features/verification/components/CheckRow'
import type { VerificationCheck } from '@/features/verification/types'

// The proof itself: every row is a check the server recomputed. The explanations are
// opt-in so a verifier who only wants the result isn't made to read cryptography.
export function EvidencePanel({ checks }: { checks: VerificationCheck[] }) {
  const [isExplained, setIsExplained] = useState(false)

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-h2 text-foreground">Verification evidence</h2>
          <p className="mt-0.5 text-body text-muted-foreground">
            Every check is recomputed from the stored document; the Merkle root is read from Polygon.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="no-print"
          aria-pressed={isExplained}
          onClick={() => setIsExplained((value) => !value)}
        >
          <Lightbulb />
          {isExplained ? 'Hide how each check works' : 'Show how each check works'}
        </Button>
      </div>
      <ol className="mt-3">
        {checks.map((check, index) => (
          <CheckRow key={check.key} check={check} step={index + 1} isExplained={isExplained} />
        ))}
      </ol>
    </Card>
  )
}
