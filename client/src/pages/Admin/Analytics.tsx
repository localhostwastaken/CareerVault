import { Anchor, FileText, ShieldCheck, Share2, Sparkles, Users } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
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

// Colours sourced directly from globals.css design tokens
const STATUS_COLORS: Record<DocumentStatus, string> = {
  REQUESTED: '#1e3a8a',
  DRAFT:      '#d97706',
  PENDING_HR: '#f59e0b',
  ISSUED:     '#059669',
  ANCHORED:   '#b45309',
  REVOKED:    '#dc2626',
  EXPIRED:    '#6b7280',
}

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

  const pieData = STATUS_ORDER
    .filter((status) => data.documents.byStatus[status])
    .map((status) => ({ status, value: data.documents.byStatus[status] }))

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
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-full" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status as DocumentStatus]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, props) =>
                        [value, (props.payload as { status?: DocumentStatus })?.status ?? '']
                      }
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.75rem',
                        fontSize: '0.75rem',
                        color: 'var(--foreground)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* total in donut centre */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="tnum text-2xl font-bold text-foreground">{data.documents.total}</span>
                  <span className="text-xs text-muted-foreground">total</span>
                </div>
              </div>

              {/* legend */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-2">
                {pieData.map((entry) => (
                  <div key={entry.status} className="flex items-center gap-1.5">
                    <span
                      className="inline-block size-2.5 rounded-full shrink-0"
                      style={{ background: STATUS_COLORS[entry.status as DocumentStatus] }}
                    />
                    <StatusBadge status={entry.status as DocumentStatus} />
                    <span className="tnum text-xs font-medium text-muted-foreground">{entry.value}</span>
                  </div>
                ))}
              </div>
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
