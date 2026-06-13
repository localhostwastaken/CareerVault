import { Anchor, FileText, ShieldCheck, Share2, Sparkles, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge, type DocumentStatus } from '@/components/shared/StatusBadge'
import { useGetAnalyticsOverviewQuery } from '@/features/analytics/api'

const STATUS_ORDER: DocumentStatus[] = [
  'REQUESTED',
  'DRAFT',
  'PENDING_HR',
  'ISSUED',
  'ANCHORED',
  'REVOKED',
  'EXPIRED',
]

const AdminAnalytics = () => {
  const { data, isLoading } = useGetAnalyticsOverviewQuery()

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Your organization at a glance." />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const maxStatus = Math.max(1, ...Object.values(data.documents.byStatus))

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Your organization at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Documents" value={data.documents.total} icon={FileText} />
        <StatCard label="Issued" value={data.documents.issued} icon={ShieldCheck} hint={`${data.documents.inProgress} in progress`} />
        <StatCard label="Anchored on-chain" value={data.documents.anchored} icon={Anchor} />
        <StatCard label="Revoked" value={data.documents.revoked} icon={ShieldCheck} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="text-sm font-semibold text-foreground">Documents by status</h2>
          {data.documents.total === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              description="Issued documents will appear here as your team requests and signs them."
            />
          ) : (
          <div className="space-y-3">
            {STATUS_ORDER.filter((status) => data.documents.byStatus[status]).map((status) => {
              const count = data.documents.byStatus[status]
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <StatusBadge status={status} />
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(count / maxStatus) * 100}%` }} />
                  </div>
                  <span className="tnum w-8 text-right text-sm font-medium text-foreground">{count}</span>
                </div>
              )
            })}
          </div>
          )}
        </Card>

        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-subtle" />
            <h2 className="text-sm font-semibold text-foreground">Team</h2>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {Object.entries(data.members.byRole).map(([role, count]) => (
              <div key={role} className="rounded-lg bg-surface-2 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-subtle">{role.replace(/_/g, ' ')}</dt>
                <dd className="tnum mt-1 text-xl font-bold text-foreground">{count}</dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            <Metric icon={Share2} label="Share views" value={data.sharing.views} hint={`${data.sharing.links} links`} />
            <Metric icon={Sparkles} label="Talent matches" value={data.talent.matches} hint={`${data.talent.jobOpenings} openings`} />
          </div>
        </Card>
      </div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Share2
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-subtle">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="tnum mt-1 text-xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  )
}

export default AdminAnalytics
