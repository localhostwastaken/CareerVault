import { Link } from 'react-router-dom'
import { Anchor, Clock, FileText, Plus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { EvidenceStrip } from '@/components/shared/EvidenceStrip'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { Section } from '@/components/shared/Section'
import { EvidenceStripSkeleton, ListSkeleton } from '@/components/shared/Skeletons'
import { CredentialRegister } from '@/features/document/components/CredentialRegister'
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
            <EvidenceStripSkeleton />
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

          // The record leads; counts are a one-line summary of it, not a panel above it.
          // Status tones apply only to a non-zero count — a green 0 would read as a result.
          return (
            <div className="flex flex-col gap-8">
              <EvidenceStrip
                label="Wallet summary"
                facts={[
                  { label: 'Documents', value: documents.length, icon: FileText },
                  { label: 'Issued', value: issued, icon: ShieldCheck, tone: issued > 0 ? 'verified' : undefined },
                  {
                    label: 'Anchored on-chain',
                    value: anchored,
                    icon: Anchor,
                    tone: anchored > 0 ? 'anchor' : undefined,
                  },
                  {
                    label: 'In progress',
                    value: pending > 0 ? `${pending} · waiting on your organisation` : '0',
                    icon: Clock,
                    tone: pending > 0 ? 'pending' : undefined,
                  },
                ]}
              />

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
                <CredentialRegister documents={documents.slice(0, RECENT_COUNT)} />
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
