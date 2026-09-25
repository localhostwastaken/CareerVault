import { AnchorCard } from '@/features/verification/components/AnchorCard'
import { CredentialRail } from '@/features/verification/components/CredentialRail'
import { EvidencePanel } from '@/features/verification/components/EvidencePanel'
import { VerdictBanner } from '@/features/verification/components/VerdictBanner'
import { VerificationNotices } from '@/features/verification/components/VerificationNotices'
import type { VerificationResult } from '@/features/verification/types'
import { cn } from '@/lib/utils'

// Verdict across the top; below it, on desktop, the credential record as a rail beside
// the evidence and its anchor. Mobile keeps the reading order: verdict, what, proof, anchor.
export function VerificationReport({ result }: { result: VerificationResult }) {
  const { document, anchor, checks } = result
  const hasEvidence = checks.length > 0 || Boolean(anchor)
  const passed = checks.filter((check) => check.status === 'pass').length

  return (
    // Without a document there is no rail, so a full-width verdict would be mostly air.
    <div className={cn('flex flex-col gap-6', !document && 'max-w-3xl')}>
      <VerdictBanner
        verdict={result.verdict}
        anchored={result.anchored}
        tally={checks.length > 0 ? { passed, total: checks.length } : undefined}
      />
      <VerificationNotices result={result} />

      {(document || hasEvidence) && (
        <div
          className={cn(
            'grid gap-8',
            document && hasEvidence && 'lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]',
          )}
        >
          {document && (
            <div className="lg:sticky lg:top-20 lg:self-start">
              <CredentialRail document={document} />
            </div>
          )}
          {hasEvidence && (
            <div className="flex min-w-0 flex-col gap-6">
              {checks.length > 0 && <EvidencePanel checks={checks} />}
              {anchor && <AnchorCard anchor={anchor} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
