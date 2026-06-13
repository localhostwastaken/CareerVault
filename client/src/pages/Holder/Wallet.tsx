import { Link } from 'react-router-dom'
import { Clock, FileText, Plus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DocumentCard } from '@/features/document/components/DocumentCard'
import { useListDocumentsQuery } from '@/features/document/api'

const IN_PROGRESS = ['REQUESTED', 'DRAFT', 'PENDING_HR']

const HolderWallet = () => {
  const { data, isLoading } = useListDocumentsQuery()
  const documents = data ?? []
  const issued = documents.filter((d) => d.status === 'ISSUED' || d.status === 'ANCHORED').length
  const pending = documents.filter((d) => IN_PROGRESS.includes(d.status)).length

  return (
    <div className="space-y-8">
      <PageHeader
        title="Career Wallet"
        description="Your verified, tamper-evident career documents in one place."
        actions={
          <Button asChild>
            <Link to="/app/request">
              <Plus />
              Request document
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total documents" value={documents.length} icon={FileText} />
        <StatCard label="Issued" value={issued} icon={ShieldCheck} />
        <StatCard label="In progress" value={pending} icon={Clock} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent documents</h2>
          {documents.length > 0 && (
            <Link to="/app/documents" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Request your first verified document from an organization you've worked with."
            action={
              <Button asChild>
                <Link to="/app/request">
                  <Plus />
                  Request document
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {documents.slice(0, 5).map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default HolderWallet
