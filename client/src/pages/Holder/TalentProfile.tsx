import { Eye, EyeOff, Mail, MailOpen, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { Section } from '@/components/shared/Section'
import { ListSkeleton } from '@/components/shared/Skeletons'
import { SkillEntryCard } from '@/features/skill/components/SkillEntryCard'
import { useGetMySkillsQuery, useSetDiscoverabilityMutation } from '@/features/skill/api'
import { useListReceivedMessagesQuery, useRespondMessageMutation } from '@/features/message/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDate } from '@/lib/format'
import { notify, toastApiError } from '@/lib/notify'
import { cn } from '@/lib/utils'

const HolderTalentProfile = () => {
  useDocumentTitle('Talent profile')
  const skillsQuery = useGetMySkillsQuery()
  const [setDiscoverability, { isLoading: isToggling }] = useSetDiscoverabilityMutation()
  const { data: messages } = useListReceivedMessagesQuery()
  const [respond, { isLoading: isResponding }] = useRespondMessageMutation()

  const discoverable = skillsQuery.data?.isDiscoverable ?? false
  const received = messages ?? []

  const toggle = async () => {
    try {
      await setDiscoverability(!discoverable).unwrap()
      notify.success(discoverable ? 'You are hidden from recruiters again.' : 'Recruiters can now find you.')
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
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Career wallet"
        title="Talent profile"
        description="Control whether recruiters can find you, and see what they'd match against."
      />

      {/* Consent is the headline decision on this page, so it leads. */}
      <Card
        className={cn(
          'flex flex-wrap items-center justify-between gap-4 p-5',
          discoverable && 'border-verified/30 bg-verified-soft',
        )}
      >
        <div className="flex items-center gap-3">
          {discoverable ? (
            <Eye className="size-5 shrink-0 text-verified" />
          ) : (
            <EyeOff className="size-5 shrink-0 text-subtle" />
          )}
          <div>
            <p className="text-label font-semibold text-foreground">
              {discoverable ? 'Discoverable by recruiters' : 'Hidden from recruiters'}
            </p>
            <p className="mt-0.5 text-label text-muted-foreground">
              {discoverable
                ? 'Recruiters can match your consented documents against their openings.'
                : 'Turn this on to let recruiters find you through AI talent search.'}
            </p>
          </div>
        </div>
        <Button variant={discoverable ? 'secondary' : 'primary'} onClick={toggle} disabled={isToggling}>
          {discoverable ? 'Turn off discovery' : 'Become discoverable'}
        </Button>
      </Card>

      <Section title="Extracted skills" description="Pulled from documents where you enabled skill extraction.">
        <QueryBoundary
          query={skillsQuery}
          skeleton={<ListSkeleton rows={2} />}
          errorTitle="Couldn't load your skills"
          isEmpty={(profile) => (profile.skills ?? []).length === 0}
          empty={
            <EmptyState
              icon={Sparkles}
              title="No skills extracted yet"
              description="Tick “Enable AI skill extraction” when requesting a document to start building this profile."
            />
          }
        >
          {(profile) => (
            <div className="flex flex-col gap-3">
              {profile.skills.map((entry) => (
                <SkillEntryCard key={entry.documentId} entry={entry} />
              ))}
            </div>
          )}
        </QueryBoundary>
      </Section>

      <Section title="Recruiter messages" description="Outreach from recruiters who matched your profile.">
        {received.length === 0 ? (
          <EmptyState
            icon={MailOpen}
            title="No messages yet"
            description={
              discoverable
                ? 'Recruiters who match you will reach out here.'
                : 'Turn on discovery above so recruiters can reach you.'
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {received.map((message) => (
              <Card key={message.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-center gap-2">
                  <Mail className="size-4 shrink-0 text-seal" />
                  <p className="text-label font-semibold text-foreground">{message.subject}</p>
                  <span className="tnum ml-auto text-label text-subtle">{formatDate(message.sentAt)}</span>
                </div>
                <p className="text-label text-muted-foreground">
                  {message.recruiterName} · {message.organizationName}
                  {message.jobTitle ? ` · ${message.jobTitle}` : ''}
                </p>
                <p className="text-body text-foreground">{message.body}</p>
                <div className="flex items-center gap-2 pt-1">
                  {message.responseType === 'PENDING' ? (
                    <>
                      <Button size="sm" onClick={() => reply(message.id, 'INTERESTED')} disabled={isResponding}>
                        I'm interested
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => reply(message.id, 'NOT_INTERESTED')}
                        disabled={isResponding}
                      >
                        Not interested
                      </Button>
                    </>
                  ) : (
                    <Badge variant={message.responseType === 'INTERESTED' ? 'verified' : 'neutral'}>
                      {message.responseType === 'INTERESTED' ? 'You replied: interested' : 'You replied: not interested'}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

export default HolderTalentProfile
