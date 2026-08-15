import { Link } from 'react-router-dom'
import { Anchor, Clock, FileText, Plus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { Section } from '@/components/shared/Section'
import { ListSkeleton, StatCardsSkeleton } from '@/components/shared/Skeletons'
import { StatCard } from '@/components/shared/StatCard'
import { DocumentCard } from '@/features/document/components/DocumentCard'
import { WalletOnboarding } from '@/features/document/components/WalletOnboarding'
import { useListDocumentsQuery } from '@/features/document/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const IN_PROGRESS = ['REQUESTED', 'DRAFT', 'PENDING_HR']
const RECENT_COUNT = 5

const HolderWallet = () => {
  useDocumentTitle('Career wallet')
  const query = useListDocumentsQuery({ role: 'HOLDER' })

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Career wallet"
        title="Your documents at a glance"
        description="Verified, tamper-evident records of the work you've done."
        actions={
          <Button asChild>
            <Link to="/app/request">
              <Plus />
              Request document
            </Link>
          </Button>
        }
      />

      <QueryBoundary
        query={query}
        skeleton={
          <div className="flex flex-col gap-8">
            <StatCardsSkeleton />
            <ListSkeleton rows={3} />
          </div>
        }
        errorTitle="Couldn't load your wallet"
        empty={<WalletOnboarding />}
      >
        {(documents) => {
          const issued = documents.filter((d) => d.status === 'ISSUED' || d.status === 'ANCHORED').length
          const anchored = documents.filter((d) => d.merkleStatus === 'ANCHORED').length
          const pending = documents.filter((d) => IN_PROGRESS.includes(d.status)).length

          return (
            <div className="flex flex-col gap-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total documents" value={documents.length} icon={FileText} />
                <StatCard label="Issued" value={issued} icon={ShieldCheck} tone="verified" />
                <StatCard label="Anchored on-chain" value={anchored} icon={Anchor} tone="anchor" />
                <StatCard
                  label="In progress"
                  value={pending}
                  icon={Clock}
                  tone={pending > 0 ? 'pending' : 'default'}
                  hint={pending > 0 ? 'Waiting on your organisation' : 'Nothing pending'}
                />
              </div>

              <Section
                title="Recent documents"
                actions={
                  documents.length > RECENT_COUNT && (
                    <Link
                      to="/app/documents"
                      className="focus-ring rounded text-label font-medium text-seal hover:underline"
                    >
                      View all {documents.length}
                    </Link>
                  )
                }
              >
                <div className="flex flex-col gap-3">
                  {documents.slice(0, RECENT_COUNT).map((document) => (
                    <DocumentCard key={document.id} document={document} />
                  ))}
                </div>
              </Section>

              {issued === 0 && (
                <EmptyState
                  icon={ShieldCheck}
                  title="Nothing to share yet"
                  description="Once a document is issued you can generate a link that anyone can verify."
                />
              )}
            </div>
          )
        }}
      </QueryBoundary>
    </div>
  )
}

export default HolderWallet
