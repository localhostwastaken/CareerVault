import { Mail, SearchX } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { FilterBar } from '@/components/shared/FilterBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { ListSkeleton } from '@/components/shared/Skeletons'
import { useListSentMessagesQuery } from '@/features/message/api'
import type { MessageResponse } from '@/features/message/types'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useListFilters } from '@/hooks/useListFilters'
import { formatDate } from '@/lib/format'

const RESPONSE: Record<MessageResponse, { label: string; variant: NonNullable<BadgeProps['variant']> }> = {
  PENDING: { label: 'Awaiting reply', variant: 'pending' },
  INTERESTED: { label: 'Interested', variant: 'verified' },
  NOT_INTERESTED: { label: 'Not interested', variant: 'neutral' },
}

const RecruiterMatches = () => {
  // The nav calls this "Matches", so the page does too — the old "Outreach" title
  // made it look like a different screen.
  useDocumentTitle('Matches')
  const query = useListSentMessagesQuery()
  const filters = useListFilters()

  const messages = query.data ?? []
  const needle = filters.search.trim().toLowerCase()
  const visible = messages
    .filter((message) => !filters.status || message.responseType === filters.status)
    .filter(
      (message) =>
        !needle ||
        message.holderName.toLowerCase().includes(needle) ||
        message.subject.toLowerCase().includes(needle) ||
        (message.jobTitle ?? '').toLowerCase().includes(needle),
    )

  const statusOptions = (Object.keys(RESPONSE) as MessageResponse[])
    .map((key) => ({
      value: key,
      label: RESPONSE[key].label,
      count: messages.filter((message) => message.responseType === key).length,
    }))
    .filter((option) => option.count > 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Talent"
        title="Matches"
        description="Candidates you've reached out to, and how they replied."
      />

      <QueryBoundary
        query={query}
        skeleton={<ListSkeleton rows={4} />}
        errorTitle="Couldn't load your outreach"
        empty={
          <EmptyState
            icon={Mail}
            title="No outreach yet"
            description="Message a matched candidate from Talent search to start a conversation."
          />
        }
      >
        {() => (
          <div className="flex flex-col gap-4">
            {(messages.length > 4 || filters.isFiltered) && (
              <FilterBar
                search={filters.search}
                onSearchChange={filters.setSearch}
                searchPlaceholder="Search by candidate, subject or role"
                statuses={statusOptions.length > 1 ? statusOptions : undefined}
                status={filters.status}
                onStatusChange={filters.setStatus}
                isFiltered={filters.isFiltered}
                onClear={() => filters.clear()}
                resultCount={filters.isFiltered ? visible.length : undefined}
              />
            )}

            {visible.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Nothing matches"
                description={`None of your ${messages.length} messages match these filters.`}
                action={
                  <Button variant="outline" onClick={() => filters.clear()}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {visible.map((message) => {
                  const response = RESPONSE[message.responseType]
                  return (
                    <Card key={message.id} className="flex flex-col gap-2 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-label font-semibold text-foreground">{message.holderName}</p>
                          <p className="text-label text-muted-foreground">
                            {message.subject}
                            {message.jobTitle ? ` · ${message.jobTitle}` : ''}
                          </p>
                        </div>
                        <Badge variant={response.variant}>{response.label}</Badge>
                      </div>
                      <p className="line-clamp-2 text-body text-muted-foreground">{message.body}</p>
                      <p className="tnum text-label text-subtle">
                        Sent {formatDate(message.sentAt)}
                        {message.readAt ? ' · read' : ' · unread'}
                      </p>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}

export default RecruiterMatches
