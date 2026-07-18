import { BadgeDollarSign, BriefcaseBusiness, Check, Star, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DOCUMENT_TYPE_LABEL, type DocumentType } from '@/features/document/types'

// Per-type guidance so the holder understands what they're asking for. The expiry copy
// mirrors the server's EXPIRY_DAYS (document.service.ts) — keep the two in sync.
const TYPE_META: Record<DocumentType, { description: string; fills: string; expiry: string; icon: LucideIcon }> = {
  EXPERIENCE_LETTER: {
    description: 'Confirms your role, dates, and responsibilities at the organization.',
    fills: 'The issuer fills in your job title, dates, and a summary',
    expiry: 'Valid 90 days',
    icon: BriefcaseBusiness,
  },
  LETTER_OF_RECOMMENDATION: {
    description: 'A personal endorsement from a manager who worked with you.',
    fills: 'The issuer fills in your relationship and their recommendation',
    expiry: 'No expiry',
    icon: Star,
  },
  SALARY_PROOF: {
    description: 'Verifies your compensation — useful for loans, visas, or rentals.',
    fills: 'The issuer fills in your salary, currency, and an as-of date',
    expiry: 'Valid 90 days',
    icon: BadgeDollarSign,
  },
}

export function DocumentTypePicker({ value, onChange }: { value: DocumentType; onChange: (type: DocumentType) => void }) {
  return (
    <div role="radiogroup" aria-label="Document type" className="grid gap-3">
      {(Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((type) => {
        const meta = TYPE_META[type]
        const Icon = meta.icon
        const selected = value === type
        return (
          <label
            key={type}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
              selected ? 'border-primary bg-accent shadow-soft' : 'border-border hover:shadow-soft',
            )}
          >
            <input
              type="radio"
              name="document-type"
              value={type}
              checked={selected}
              onChange={() => onChange(type)}
              className="sr-only"
            />
            <div
              className={cn(
                'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg',
                selected ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted-foreground',
              )}
            >
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-foreground">{DOCUMENT_TYPE_LABEL[type]}</p>
                {selected && <Check className="size-4 shrink-0 text-primary" />}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{meta.description}</p>
              <p className="mt-2 text-xs text-subtle">
                {meta.fills} · {meta.expiry}
              </p>
            </div>
          </label>
        )
      })}
    </div>
  )
}
