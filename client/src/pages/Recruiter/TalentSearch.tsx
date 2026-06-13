import { useState } from 'react'
import { Briefcase, Plus, Search, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useGetMatchesQuery, useListJobOpeningsQuery, useSearchTalentMutation } from '@/features/recruiter/api'
import { CandidateCard, type CandidateView } from '@/features/recruiter/components/CandidateCard'
import { CreateJobOpeningDialog } from '@/features/recruiter/components/CreateJobOpeningDialog'
import { MessageDialog } from '@/features/recruiter/components/MessageDialog'
import { cn } from '@/lib/utils'
import { notify, toastApiError } from '@/lib/notify'

const RecruiterTalentSearch = () => {
  const { data: openings } = useListJobOpeningsQuery()
  const [createOpen, setCreateOpen] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [target, setTarget] = useState<CandidateView | null>(null)
  const [search, { isLoading: isSearching }] = useSearchTalentMutation()

  const list = openings ?? []
  const selectedId = picked ?? list[0]?.id ?? null
  const selected = list.find((o) => o.id === selectedId) ?? null
  const { data: matches } = useGetMatchesQuery(selectedId ?? '', { skip: !selectedId })

  const candidates: CandidateView[] = (matches ?? []).map((m) => ({
    holderId: m.holderId,
    holderName: m.holderName,
    skills: m.skills,
    matchScore: m.matchScore,
    baseValue: m.explanation?.baseValue ?? 0,
    contributions: m.explanation?.contributions ?? [],
  }))

  const runSearch = async () => {
    if (!selectedId) return
    try {
      const result = await search(selectedId).unwrap()
      notify.success(`Found ${result.matches.length} candidate${result.matches.length === 1 ? '' : 's'}.`)
    } catch (error) {
      toastApiError(error, 'Search failed — is the AI service running?')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Talent Search"
        description="AI-matched, consented candidates — ranked and explained."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            New opening
          </Button>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No job openings yet"
          description="Create an opening to start matching it against discoverable talent."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              New opening
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-2">
            {list.map((opening) => (
              <button
                key={opening.id}
                type="button"
                onClick={() => setPicked(opening.id)}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  opening.id === selectedId
                    ? 'border-primary bg-accent'
                    : 'border-border bg-card hover:bg-surface-2',
                )}
              >
                <p className="font-medium text-foreground">{opening.title}</p>
                <p className="text-xs text-muted-foreground">
                  {opening.matchCount} match{opening.matchCount === 1 ? '' : 'es'}
                  {opening.closedAt ? ' · closed' : ''}
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-4 lg:col-span-2">
            {selected && (
              <Card className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-foreground">{selected.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>
                  </div>
                  <Button onClick={runSearch} disabled={isSearching}>
                    <Search />
                    {isSearching ? 'Searching…' : 'Find candidates'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selected.requiredSkills.map((skill) => (
                    <Badge key={skill} variant="primary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {candidates.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No matches yet"
                description="Run a search to rank consented candidates for this opening."
              />
            ) : (
              <div className="space-y-3">
                {candidates.map((candidate) => (
                  <CandidateCard key={candidate.holderId} candidate={candidate} onMessage={setTarget} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <CreateJobOpeningDialog open={createOpen} onOpenChange={setCreateOpen} />
      {target && selectedId && (
        <MessageDialog
          open={Boolean(target)}
          onOpenChange={(open) => !open && setTarget(null)}
          holderId={target.holderId}
          holderName={target.holderName}
          jobOpeningId={selectedId}
        />
      )}
    </div>
  )
}

export default RecruiterTalentSearch
