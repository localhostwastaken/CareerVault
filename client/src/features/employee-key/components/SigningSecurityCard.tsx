import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ListSkeleton } from '@/components/shared/Skeletons'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { Section } from '@/components/shared/Section'
import { useGetMyEmployeeKeysQuery } from '@/features/employee-key/api'
import { EnrollForm } from '@/features/employee-key/components/EnrollForm'
import type { EmployeeKeyStatus } from '@/features/employee-key/types'
import { formatDate } from '@/lib/format'

function KeyRow({ status, isEditing, onEdit, onDone }: { status: EmployeeKeyStatus; isEditing: boolean; onEdit: () => void; onDone: () => void }) {
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-h3 text-foreground">{status.organizationName}</p>
          {status.isEnrolled ? (
            <Badge variant="verified" className="self-start">
              Key active since {formatDate(status.enrolledAt)}
            </Badge>
          ) : (
            <Badge variant="pending" className="self-start">
              Not set up — you cannot sign yet
            </Badge>
          )}
        </div>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <KeyRound />
            {status.isEnrolled ? 'Replace key' : 'Set up'}
          </Button>
        )}
      </div>
      {status.isEnrolled && !isEditing && (
        <ul className="flex flex-col gap-1 border-t border-border pt-4 text-label text-muted-foreground">
          {status.questions.map((question) => (
            <li key={question.id}>{question.text}</li>
          ))}
        </ul>
      )}
      {isEditing && <EnrollForm status={status} onDone={onDone} />}
    </Card>
  )
}

// Managers and HR sign with a personal key derived from details only they know. This is
// where they create it, see which questions they chose, and replace it.
export function SigningSecurityCard() {
  const query = useGetMyEmployeeKeysQuery()
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <Section
      title="Signing security"
      description="Your personal signing key, made from your date of birth, an ID and three answers. Only an encrypted copy of the key is stored, never the answers."
    >
      <QueryBoundary query={query} skeleton={<ListSkeleton rows={1} />} headingLevel={3}>
        {(statuses) => (
          <div className="flex flex-col gap-4">
            {statuses.map((status) => (
              <KeyRow
                key={status.organizationId}
                status={status}
                isEditing={editing === status.organizationId}
                onEdit={() => setEditing(status.organizationId)}
                onDone={() => setEditing(null)}
              />
            ))}
          </div>
        )}
      </QueryBoundary>
    </Section>
  )
}
