import { Mail } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useListSentMessagesQuery } from '@/features/message/api'
import type { MessageResponse } from '@/features/message/types'
import { formatDate } from '@/lib/format'

const RESPONSE: Record<MessageResponse, { label: string; variant: NonNullable<BadgeProps['variant']> }> = {
  PENDING: { label: 'Awaiting reply', variant: 'pending' },
  INTERESTED: { label: 'Interested', variant: 'verified' },
  NOT_INTERESTED: { label: 'Not interested', variant: 'neutral' },
}

const RecruiterMatches = () => {
  const { data, isLoading } = useListSentMessagesQuery()
  const messages = data ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Outreach" description="Candidates you've messaged and how they responded." />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : messages.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No outreach yet"
          description="Message a matched candidate from Talent Search to start a conversation."
        />
      ) : (
        <div className="space-y-3">
          {messages.map((message) => {
            const response = RESPONSE[message.responseType]
            return (
              <Card key={message.id} className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{message.holderName}</p>
                    <p className="text-sm text-muted-foreground">
                      {message.subject}
                      {message.jobTitle ? ` · ${message.jobTitle}` : ''}
                    </p>
                  </div>
                  <Badge variant={response.variant}>{response.label}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{message.body}</p>
                <p className="text-xs text-subtle">Sent {formatDate(message.sentAt)}</p>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default RecruiterMatches
