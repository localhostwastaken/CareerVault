import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { useVerifyByHashQuery, useVerifyByTokenQuery } from '@/features/verification/api'
import { VerificationReport } from '@/features/verification/components/VerificationReport'

const VerifyResult = () => {
  const { hash, token } = useParams()
  const hashQuery = useVerifyByHashQuery(hash ?? '', { skip: !hash })
  const tokenQuery = useVerifyByTokenQuery(token ?? '', { skip: !token })
  const { data, isLoading, isError } = hash ? hashQuery : tokenQuery

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
        <Link to="/verify">
          <ArrowLeft />
          Verify another
        </Link>
      </Button>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Running verification…
        </div>
      ) : isError || !data ? (
        <EmptyState
          icon={WifiOff}
          title="Verification unavailable"
          description="We couldn't reach the verification service. Please try again."
          action={
            <Button asChild variant="secondary">
              <Link to="/verify">Try again</Link>
            </Button>
          }
        />
      ) : (
        <VerificationReport result={data} />
      )}
    </div>
  )
}

export default VerifyResult
