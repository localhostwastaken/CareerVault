import { AnchorBadge } from '@/features/verification/components/AnchorBadge'
import { CredentialRail } from '@/features/verification/components/CredentialRail'
import { EvidencePanel } from '@/features/verification/components/EvidencePanel'
import { VerdictBanner } from '@/features/verification/components/VerdictBanner'
import { VerificationNotices } from '@/features/verification/components/VerificationNotices'
import type { VerificationResult } from '@/features/verification/types'
import { cn } from '@/lib/utils'

// Verdict across the top with the on-chain badge beneath it as a secondary fact; below, on
// desktop, the credential record as a rail beside the evidence.
export function VerificationReport({ result }: { result: VerificationResult }) {
  const { document, checks } = result
  const passed = checks.filter((check) => check.status === 'pass').length

  return (
    // Without a document there is no rail, so a full-width verdict would be mostly air.
    <div className={cn('flex flex-col gap-6', !document && 'max-w-3xl')}>
      <VerdictBanner verdict={result.verdict} tally={checks.length > 0 ? { passed, total: checks.length } : undefined}>
        {result.verdict !== 'NOT_FOUND' && <AnchorBadge anchor={result.anchor} />}
      </VerdictBanner>
      <VerificationNotices result={result} />

      {(document || checks.length > 0) && (
        <div
          className={cn(
            'grid gap-8',
            document && checks.length > 0 && 'lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]',
          )}
        >
          {document && (
            <div className="lg:sticky lg:top-20 lg:self-start">
              <CredentialRail result={result} />
            </div>
          )}
          {checks.length > 0 && (
            <div className="min-w-0">
              <EvidencePanel checks={checks} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
