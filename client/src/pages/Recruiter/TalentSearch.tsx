import { useState } from 'react'
import { Briefcase, Loader2, Plus, Search, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { ListSkeleton } from '@/components/shared/Skeletons'
import { useGetMatchesQuery, useListJobOpeningsQuery, useSearchTalentMutation } from '@/features/recruiter/api'
import { CandidateCard, type CandidateView } from '@/features/recruiter/components/CandidateCard'
import { CreateJobOpeningDialog } from '@/features/recruiter/components/CreateJobOpeningDialog'
import { JobOpeningList } from '@/features/recruiter/components/JobOpeningList'
import { MessageDialog } from '@/features/recruiter/components/MessageDialog'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { notify, toastApiError } from '@/lib/notify'

const RecruiterTalentSearch = () => {
  useDocumentTitle('Talent search')
  const openingsQuery = useListJobOpeningsQuery()
  const [createOpen, setCreateOpen] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [target, setTarget] = useState<CandidateView | null>(null)
  const [search, { isLoading: isSearching }] = useSearchTalentMutation()

  const openings = openingsQuery.data ?? []
  const selectedId = picked ?? openings[0]?.id ?? null
  const selected = openings.find((opening) => opening.id === selectedId) ?? null
  const matchesQuery = useGetMatchesQuery(selectedId ?? '', {
    skip: !selectedId,
  })

  const candidates: CandidateView[] = (matchesQuery.data ?? []).map((match) => ({
    holderId: match.holderId,
    holderName: match.holderName,
    skills: match.skills,
    evidence: match.evidence,
    matchScore: match.matchScore,
    baseValue: match.explanation?.baseValue ?? 0,
    contributions: match.explanation?.contributions ?? [],
  }))

  const runSearch = async () => {
    if (!selectedId) return
    try {
      const result = await search(selectedId).unwrap()
      notify.success(`Ranked ${result.matches.length} candidate${result.matches.length === 1 ? '' : 's'}.`)
    } catch (error) {
      toastApiError(error, 'Search failed — is the AI service running?')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Talent"
        title="Talent search"
        description="Consented candidates, ranked against your openings and explained factor by factor."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            New opening
          </Button>
        }
      />

      <QueryBoundary
        query={openingsQuery}
        skeleton={<ListSkeleton rows={3} />}
        errorTitle="Couldn't load your openings"
        empty={
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
        }
      >
        {() => (
          <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
            <JobOpeningList openings={openings} selectedId={selectedId} onSelect={setPicked} />

            <div className="flex min-w-0 flex-col gap-4">
              {selected && (
                <Card className="flex flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-h2 text-foreground">{selected.title}</h2>
                      <p className="mt-1 text-body text-muted-foreground">{selected.description}</p>
                    </div>
                    <Button onClick={runSearch} disabled={isSearching} className="shrink-0">
                      {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
                      {isSearching ? 'Ranking…' : 'Find candidates'}
                    </Button>
                  </div>
                  {selected.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.requiredSkills.map((skill) => (
                        <Badge key={skill} variant="primary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {isSearching || matchesQuery.isLoading ? (
                <ListSkeleton rows={3} />
              ) : matchesQuery.isError ? (
                // A failed fetch is not "no matches" — saying so would tell a recruiter
                // this opening has no candidates when it may have many.
                <ErrorState
                  headingLevel={3}
                  title="Couldn't load matches"
                  error={matchesQuery.error}
                  onRetry={matchesQuery.refetch}
                />
              ) : candidates.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  headingLevel={3}
                  title="No matches yet"
                  description="Run a search to rank consented candidates against this opening."
                  action={
                    <Button variant="outline" onClick={runSearch} disabled={!selectedId}>
                      <Search />
                      Find candidates
                    </Button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {/* The ranker's features never include verification status, so say so
                      once, where the ranked list starts. */}
                  <p className="text-label text-muted-foreground">
                    Ranked by fit from skills extracted from each candidate's documents. The score does not weigh
                    verification status — the credential counts on each record show what is issued and anchored.
                  </p>
                  {candidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.holderId}
                      candidate={candidate}
                      requiredSkills={selected?.requiredSkills ?? []}
                      onMessage={setTarget}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </QueryBoundary>

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
