import { Anchor, Ban, FileText, Share2, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { Section } from '@/components/shared/Section'
import { ListSkeleton, StatCardsSkeleton } from '@/components/shared/Skeletons'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBreakdown } from '@/features/analytics/components/StatusBreakdown'
import { useGetAnalyticsOverviewQuery } from '@/features/analytics/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatNumber } from '@/lib/format'

function Metric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="inset-well p-3">
      <p className="label-micro">{label}</p>
      <p className="tnum mt-1 text-h2 text-foreground">{formatNumber(value)}</p>
      <p className="text-label text-muted-foreground">{hint}</p>
    </div>
  )
}

const AdminAnalytics = () => {
  useDocumentTitle('Analytics')
  const query = useGetAnalyticsOverviewQuery()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Admin console"
        title="Analytics"
        description="Issuance, sharing and talent activity across your organisation."
      />

      <QueryBoundary
        query={query}
        skeleton={
          <div className="flex flex-col gap-8">
            <StatCardsSkeleton count={4} />
            <ListSkeleton rows={3} />
          </div>
        }
        // The previous version early-returned on `isLoading || !data`, so a failed
        // request showed "Loading…" forever.
        errorTitle="Couldn't load analytics"
        isEmpty={(data) => !data}
      >
        {(data) => (
          <div className="flex flex-col gap-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Documents" value={formatNumber(data.documents.total)} icon={FileText} />
              <StatCard
                label="Issued"
                value={formatNumber(data.documents.issued)}
                icon={ShieldCheck}
                tone="verified"
                hint={`${formatNumber(data.documents.inProgress)} still in progress`}
              />
              <StatCard
                label="Anchored on-chain"
                value={formatNumber(data.documents.anchored)}
                icon={Anchor}
                tone="anchor"
              />
              <StatCard
                label="Revoked"
                value={formatNumber(data.documents.revoked)}
                icon={Ban}
                tone={data.documents.revoked > 0 ? 'revoked' : 'default'}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="flex flex-col gap-5 p-6">
                <h2 className="text-h2 text-foreground">Documents by status</h2>
                {data.documents.total === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No documents yet"
                    description="Issued documents will appear here as your team requests and signs them."
                  />
                ) : (
                  <StatusBreakdown byStatus={data.documents.byStatus} total={data.documents.total} />
                )}
              </Card>

              <Card className="flex flex-col gap-5 p-6">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-subtle" />
                  <h2 className="text-h2 text-foreground">Team &amp; reach</h2>
                </div>
                <dl className="grid grid-cols-2 gap-3">
                  {Object.entries(data.members.byRole).map(([role, count]) => (
                    <div key={role} className="inset-well p-3">
                      <dt className="label-micro">{role.replace(/_/g, ' ')}</dt>
                      <dd className="tnum mt-1 text-h2 text-foreground">{formatNumber(count)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="grid grid-cols-2 gap-3 border-t border-border pt-5">
                  <Metric
                    label="Share views"
                    value={data.sharing.views}
                    hint={`across ${formatNumber(data.sharing.links)} links`}
                  />
                  <Metric
                    label="Talent matches"
                    value={data.talent.matches}
                    hint={`for ${formatNumber(data.talent.jobOpenings)} openings`}
                  />
                </div>
              </Card>
            </div>

            <Section title="Reading this" description="Counts are live and scoped to your organisation.">
              <p className="text-body text-muted-foreground">
                <Share2 className="mr-1.5 inline size-4 align-text-bottom text-subtle" />
                Share views count every time someone opens one of your holders' share links.
                <Sparkles className="ml-3 mr-1.5 inline size-4 align-text-bottom text-subtle" />
                Talent matches count consented candidates ranked against your open roles.
              </p>
            </Section>
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}

export default AdminAnalytics
