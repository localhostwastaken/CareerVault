import { Construction } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'

// Placeholder for routes whose feature ships in a later build phase, so the
// per-role navigation is fully walkable today.
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <EmptyState
        icon={Construction}
        title="Coming soon"
        description="This screen is part of an upcoming build phase."
      />
    </div>
  )
}
