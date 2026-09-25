import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/ErrorState'
import { useVerifyByHashQuery, useVerifyByTokenQuery } from '@/features/verification/api'
import { VerificationReport } from '@/features/verification/components/VerificationReport'
import { VerifyingProgress } from '@/features/verification/components/VerifyingProgress'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const VerifyResult = () => {
  const { hash, token } = useParams()
  const hashQuery = useVerifyByHashQuery(hash ?? '', { skip: !hash })
  const tokenQuery = useVerifyByTokenQuery(token ?? '', { skip: !token })
  const { data, isLoading, isError, error, refetch } = hash ? hashQuery : tokenQuery

  useDocumentTitle(data ? `Verification — ${data.verdict.toLowerCase().replaceAll('_', ' ')}` : 'Verifying document')

  return (
    // Wide enough for the report's rail + evidence columns. Narrow states share its left
    // edge instead of re-centring, so nothing jumps sideways when the report lands.
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <div className="no-print mb-5 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/verify">
            <ArrowLeft />
            Verify another
          </Link>
        </Button>
        {data && (
          // Verification reports get filed and forwarded; the print stylesheet in
          // globals.css strips chrome and expands link targets.
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="max-w-2xl">
          <VerifyingProgress />
        </div>
      ) : isError || !data ? (
        <div className="max-w-2xl">
          <ErrorState
            // Replaces the whole report, verdict banner h1 included, so it carries the h1.
            headingLevel={1}
            title="Verification unavailable"
            description="We couldn’t reach the verification service. This says nothing about the document itself — please try again."
            error={error}
            onRetry={refetch}
          />
        </div>
      ) : (
        <VerificationReport result={data} />
      )}
    </div>
  )
}

export default VerifyResult
