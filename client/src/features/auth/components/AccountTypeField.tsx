import { Building2, Check, UserRound, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type AccountType = 'HOLDER' | 'ORG_ADMIN'

const OPTIONS: Array<{ value: AccountType; icon: LucideIcon; title: string; body: string }> = [
  { value: 'HOLDER', icon: UserRound, title: 'Employee', body: 'Collect and share my own documents.' },
  { value: 'ORG_ADMIN', icon: Building2, title: 'Organisation', body: 'Issue documents to my people.' },
]

interface AccountTypeFieldProps {
  value: AccountType
  onChange: (value: AccountType) => void
  name: string
}

// This choice decides which portal the user lands in, so it deserves more weight than
// a dropdown option. Real radio inputs keep arrow-key behaviour and grouping semantics;
// the cards are just their labels.
export function AccountTypeField({ value, onChange, name }: AccountTypeFieldProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OPTIONS.map((option) => {
        const Icon = option.icon
        const isSelected = value === option.value
        return (
          <label
            key={option.value}
            className={cn(
              'relative flex cursor-pointer flex-col gap-2 rounded-lg border p-3 transition-colors',
              'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
              isSelected
                ? 'border-primary bg-accent'
                : 'border-input bg-card hover:border-foreground/40 hover:bg-surface-2',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="flex items-center justify-between">
              <Icon className={cn('size-5', isSelected ? 'text-seal' : 'text-subtle')} />
              {isSelected && <Check className="size-4 text-seal" />}
            </span>
            <span>
              <span className="block text-label font-semibold text-foreground">{option.title}</span>
              <span className="mt-0.5 block text-label text-muted-foreground">{option.body}</span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
