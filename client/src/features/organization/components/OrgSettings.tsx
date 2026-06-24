import { ShieldCheck, ShieldOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { useGetOrganizationQuery, useVerifyDomainMutation } from '@/features/organization/api'
import { formatDate } from '@/lib/format'
import { notify, toastApiError } from '@/lib/notify'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export function OrgSettings({ orgId }: { orgId: string }) {
  const { data: org, isLoading } = useGetOrganizationQuery(orgId)
  const [verifyDomain, { isLoading: verifying }] = useVerifyDomainMutation()

  if (isLoading || !org) return <p className="text-sm text-muted-foreground">Loading…</p>

  const onVerify = async () => {
    try {
      await verifyDomain(org.id).unwrap()
      notify.success('Domain verified')
    } catch (error) {
      toastApiError(error, 'Domain verification failed')
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{org.name}</CardTitle>
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
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Row label="Domain" value={org.domain} />
        <Row label="Plan" value={org.subscriptionTier} />
        <Row label="Created" value={formatDate(org.createdAt)} />
        {org.rootDid && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">DID</span>
            <HashDisplay value={org.rootDid} lead={18} tail={8} />
          </div>
        )}
        {!org.isVerified && (
          <div className="space-y-2 rounded-lg bg-pending-soft p-3">
            <p className="text-pending">Add this TXT record to your DNS, then verify:</p>
            <HashDisplay value={org.dnsToken} lead={48} tail={6} className="w-full justify-between" />
            <Button size="sm" onClick={onVerify} disabled={verifying}>
              Verify domain
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
