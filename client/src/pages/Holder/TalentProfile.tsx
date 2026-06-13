import { Eye, EyeOff, Mail, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { DOCUMENT_TYPE_LABEL, type DocumentType } from '@/features/document/types'
import { useGetMySkillsQuery, useSetDiscoverabilityMutation } from '@/features/skill/api'
import { useListReceivedMessagesQuery, useRespondMessageMutation } from '@/features/message/api'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { notify, toastApiError } from '@/lib/notify'

const HolderTalentProfile = () => {
  const { data: profile, isLoading } = useGetMySkillsQuery()
  const [setDiscoverability, { isLoading: isToggling }] = useSetDiscoverabilityMutation()
  const { data: messages } = useListReceivedMessagesQuery()
  const [respond, { isLoading: isResponding }] = useRespondMessageMutation()

  const discoverable = profile?.isDiscoverable ?? false
  const skills = profile?.skills ?? []
  const received = messages ?? []

  const toggle = async () => {
    try {
      await setDiscoverability(!discoverable).unwrap()
      notify.success(!discoverable ? 'You are now discoverable.' : 'Discovery turned off.')
    } catch (error) {
      toastApiError(error, 'Could not update discovery')
    }
  }

  const reply = async (id: string, responseType: 'INTERESTED' | 'NOT_INTERESTED') => {
    try {
      await respond({ id, responseType }).unwrap()
    } catch (error) {
      toastApiError(error, 'Could not send your response')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Talent Profile" description="Control your discoverability and see what recruiters can match." />

      <Card className={cn('flex flex-wrap items-center justify-between gap-4 p-5', discoverable && 'border-verified/30 bg-verified-soft/40')}>
        <div className="flex items-center gap-3">
          {discoverable ? <Eye className="size-5 text-verified" /> : <EyeOff className="size-5 text-subtle" />}
          <div>
            <p className="font-semibold text-foreground">{discoverable ? 'Discoverable by recruiters' : 'Hidden from recruiters'}</p>
            <p className="text-sm text-muted-foreground">
              {discoverable
                ? 'Recruiters can match your consented documents to their openings.'
                : 'Turn on to let recruiters find you via AI talent search.'}
            </p>
          </div>
        </div>
        <Button variant={discoverable ? 'secondary' : 'primary'} onClick={toggle} disabled={isToggling}>
          {discoverable ? 'Turn off' : 'Become discoverable'}
        </Button>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Extracted skills</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : skills.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No skills extracted yet"
            description="Enable skill extraction when requesting a document to build your talent profile."
          />
        ) : (
          skills.map((entry) => (
            <Card key={entry.documentId} className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{DOCUMENT_TYPE_LABEL[entry.documentType as DocumentType] ?? entry.documentType}</p>
                <span className="text-xs text-subtle">{entry.organizationName}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {entry.skills.map((skill) => (
                  <Badge key={skill} variant="neutral">
                    {skill}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {[entry.jobTitle, entry.seniority, entry.yearsOfExperience ? `${entry.yearsOfExperience} yrs` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </Card>
          ))
        )}
      </section>

      {received.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Recruiter messages</h2>
          {received.map((message) => (
            <Card key={message.id} className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-primary" />
                <p className="font-semibold text-foreground">{message.subject}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {message.recruiterName} · {message.organizationName}
                {message.jobTitle ? ` · ${message.jobTitle}` : ''}
              </p>
              <p className="text-sm text-foreground">{message.body}</p>
              <div className="flex items-center gap-2 pt-1">
                {message.responseType === 'PENDING' ? (
                  <>
                    <Button size="sm" onClick={() => reply(message.id, 'INTERESTED')} disabled={isResponding}>
                      Interested
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => reply(message.id, 'NOT_INTERESTED')} disabled={isResponding}>
                      Not interested
                    </Button>
                  </>
                ) : (
                  <Badge variant={message.responseType === 'INTERESTED' ? 'verified' : 'neutral'}>
                    {message.responseType === 'INTERESTED' ? 'You replied: Interested' : 'You replied: Not interested'}
                  </Badge>
                )}
                <span className="ml-auto text-xs text-subtle">{formatDate(message.sentAt)}</span>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  )
}

export default HolderTalentProfile
