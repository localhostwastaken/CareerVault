import { Link } from 'react-router-dom'
import { Clock, FileText, Plus, Search, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DocumentCard } from '@/features/document/components/DocumentCard'
import { useListDocumentsQuery } from '@/features/document/api'

const IN_PROGRESS = ['REQUESTED', 'DRAFT', 'PENDING_HR']

const STEPS = [
  { icon: FileText, label: 'Request a document', detail: 'Choose an organization and document type.' },
  { icon: ShieldCheck, label: 'Manager signs it', detail: 'Your organization verifies and signs the document.' },
  { icon: Search, label: 'Share with verifiers', detail: 'Anyone can verify your documents via a secure link.' },
]

const HolderWallet = () => {
  const { data, isLoading } = useListDocumentsQuery({ role: 'HOLDER' })
  const documents = data ?? []
  const issued = documents.filter((d) => d.status === 'ISSUED' || d.status === 'ANCHORED').length
  const pending = documents.filter((d) => IN_PROGRESS.includes(d.status)).length
  const isNew = !isLoading && documents.length === 0

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

      {isNew && (
        <Card className="border-primary/20 bg-primary/5 shadow-soft">
          <CardContent className="py-6">
            <h2 className="font-semibold text-foreground">Welcome to CareerVault</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your career documents are cryptographically signed and verifiable — no more fake experience letters.
              Here's how to get started:
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <div key={step.label} className="flex gap-3 rounded-lg border bg-surface p-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
