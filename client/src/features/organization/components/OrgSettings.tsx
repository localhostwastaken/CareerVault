import { ShieldCheck, ShieldOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { DetailSkeleton } from '@/components/shared/Skeletons'
import { useGetOrganizationQuery, useVerifyDomainMutation } from '@/features/organization/api'
import { formatDate } from '@/lib/format'
import { notify, toastApiError } from '@/lib/notify'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="tnum text-label font-medium text-foreground">{value}</dd>
    </div>
  )
}

export function OrgSettings({ orgId }: { orgId: string }) {
  const query = useGetOrganizationQuery(orgId)
  const [verifyDomain, { isLoading: isVerifying }] = useVerifyDomainMutation()

  const onVerify = async (id: string) => {
    try {
      await verifyDomain(id).unwrap()
      notify.success('Domain verified — you can now issue documents.')
    } catch (error) {
      toastApiError(error, 'Domain verification failed')
    }
  }

  return (
    <QueryBoundary
      query={query}
      skeleton={<DetailSkeleton />}
      errorTitle="Couldn't load your organisation"
      isEmpty={(org) => !org}
    >
      {(org) => (
        <div className="flex max-w-2xl flex-col gap-6">
          {/* Unverified orgs cannot issue, so the fix comes before the details. */}
          {!org.isVerified && (
            <Card className="flex flex-col gap-4 border-pending/30 bg-pending-soft p-5">
              <div>
                <p className="text-label font-semibold text-pending">Verify your domain to start issuing</p>
                <p className="mt-1 text-body text-muted-foreground">
                  Proving you control <span className="font-medium text-foreground">{org.domain}</span> is what makes
                  your documents trustworthy to third parties.
                </p>
              </div>
              <ol className="flex flex-col gap-3">
                <li className="flex gap-3">
                  <span className="tnum flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-micro tracking-normal text-primary-foreground">
                    1
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-label text-foreground">Add this TXT record to your DNS</p>
                    <HashDisplay
                      value={org.dnsToken}
                      lead={44}
                      tail={8}
                      label="Copy DNS TXT record"
                      className="mt-1.5 w-full"
                    />
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="tnum flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-micro tracking-normal text-primary-foreground">
                    2
                  </span>
                  <div className="flex-1">
                    <p className="text-label text-foreground">Then check it — DNS can take a few minutes to spread.</p>
                    <Button size="sm" className="mt-2" onClick={() => onVerify(org.id)} disabled={isVerifying}>
                      Verify domain
                    </Button>
                  </div>
                </li>
              </ol>
            </Card>
          )}

          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-h2 text-foreground">{org.name}</h2>
              {org.isVerified ? (
                <Badge variant="verified">
                  <ShieldCheck />
                  Verified
                </Badge>
              ) : (
                <Badge variant="pending">
                  <ShieldOff />
                  Unverified
                </Badge>
              )}
            </div>
            <dl className="mt-5 border-t border-border">
              <Row label="Domain" value={org.domain} />
              <Row label="Plan" value={<span className="capitalize">{org.subscriptionTier.toLowerCase()}</span>} />
              <Row label="Created" value={formatDate(org.createdAt)} />
              {org.verifiedAt && <Row label="Verified" value={formatDate(org.verifiedAt)} />}
              {org.rootDid && (
                <Row
                  label="Root DID"
                  value={<HashDisplay value={org.rootDid} lead={16} tail={8} label="Copy root DID" />}
                />
              )}
            </dl>
          </Card>
        </div>
      )}
    </QueryBoundary>
  )
}
