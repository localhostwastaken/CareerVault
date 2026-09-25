import { Notice } from '@/components/shared/Notice'
import type { VerificationResult } from '@/features/verification/types'
import { formatDate } from '@/lib/format'

const REVOCATION_LABEL: Record<string, string> = {
  ADMINISTRATIVE_ERROR: 'Administrative error',
  POLICY_VIOLATION: 'Policy violation',
  ISSUED_IN_ERROR: 'Issued in error',
}

// What the verdict means for the reader, in plain words, and what to do about it.
export function VerificationNotices({ result }: { result: VerificationResult }) {
  const { revocation, anchor } = result
  return (
    <>
      {revocation && (
        <Notice tone="revoked" title={`Revoked${revocation.revokedAt ? ` on ${formatDate(revocation.revokedAt)}` : ''}`}>
          {revocation.reason ||
            (revocation.code ? `${REVOCATION_LABEL[revocation.code] ?? revocation.code}.` : 'No reason provided.')}{' '}
          Ask the holder for a replacement issued after this date.
        </Notice>
      )}
      {result.verdict === 'EXPIRED' && (
        <Notice tone="pending" title="This credential has expired">
          It was valid when issued but is now past its expiry date. Ask the holder for an up-to-date document from the
          issuer.
        </Notice>
      )}
      {result.erased && (
        <Notice tone="neutral" title="The holder erased this credential">
          They exercised their right to erasure, so the original content no longer exists and nothing can be checked
          against this hash.
          {anchor && ' The on-chain anchor below still shows when the hash was anchored.'}
        </Notice>
      )}
      {result.verdict === 'INVALID' && !result.erased && (
        <Notice tone="revoked" title="This credential could not be verified">
          One or more authenticity checks failed — the content may have been altered. Don't rely on it; contact the
          issuing organization directly.
        </Notice>
      )}
      {result.verdict === 'NOT_FOUND' && (
        <Notice tone="neutral" title="Nothing to show for this reference">
          Double-check the share link or document hash. If it's correct, the issuer may have removed the document.
        </Notice>
      )}
    </>
  )
}
