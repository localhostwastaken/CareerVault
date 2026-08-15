import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
  count?: number
}

interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  /** Status chips. Omit to hide the row. The "all" chip is prepended automatically. */
  statuses?: FilterOption[]
  status?: string
  onStatusChange?: (value: string) => void
  sortOptions?: FilterOption[]
  sort?: string
  onSortChange?: (value: string) => void
  isFiltered?: boolean
  onClear?: () => void
  /** Result count, announced politely so filtering is audible to screen readers. */
  resultCount?: number
  className?: string
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  statuses,
  status = '',
  onStatusChange,
  sortOptions,
  sort,
  onSortChange,
  isFiltered,
  onClear,
  resultCount,
  className,
}: FilterBarProps) {
  const chips: FilterOption[] | undefined = statuses && [{ value: '', label: 'All' }, ...statuses]

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="pl-9"
          />
        </div>

        {sortOptions && onSortChange && (
          <SelectNative
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            aria-label="Sort by"
            className="w-auto min-w-36"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectNative>
        )}

        {isFiltered && onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X />
            Clear
          </Button>
        )}
      </div>

      {chips && onStatusChange && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {chips.map((chip) => {
            const isActive = chip.value === status
            return (
              <button
                key={chip.value || 'all'}
                type="button"
                aria-pressed={isActive}
                onClick={() => onStatusChange(chip.value)}
                className={cn(
                  'focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-label transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-rule-strong hover:text-foreground',
                )}
              >
                {chip.label}
                {chip.count !== undefined && <span className="tnum opacity-70">{chip.count}</span>}
              </button>
            )
          })}
        </div>
      )}

      {resultCount !== undefined && (
        <p aria-live="polite" className="tnum text-label text-muted-foreground">
          {resultCount} {resultCount === 1 ? 'result' : 'results'}
        </p>
      )}
    </div>
  )
}
