import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DOCUMENT_TYPE_LABEL, type DocumentType } from '@/features/document/types'

interface SkillEntry {
  documentId: string
  documentType: string
  organizationName: string
  skills: string[]
  jobTitle?: string | null
  seniority?: string | null
  yearsOfExperience?: number | null
}

export function SkillEntryCard({ entry }: { entry: SkillEntry }) {
  const meta = [entry.jobTitle, entry.seniority, entry.yearsOfExperience ? `${entry.yearsOfExperience} yrs` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-label font-semibold text-foreground">
          {DOCUMENT_TYPE_LABEL[entry.documentType as DocumentType] ?? entry.documentType}
        </p>
        <span className="text-label text-muted-foreground">{entry.organizationName}</span>
      </div>
      {meta && <p className="text-label text-muted-foreground">{meta}</p>}
      <div className="flex flex-wrap gap-1.5">
        {entry.skills.map((skill) => (
          <Badge key={skill} variant="neutral">
            {skill}
          </Badge>
        ))}
      </div>
    </Card>
  )
}
