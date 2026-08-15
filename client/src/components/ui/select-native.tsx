import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Lightweight native <select> styled to our tokens. Props/ref forward to the
// <select> itself so it composes with the RHF <FormControl> Slot.
const SelectNative = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full cursor-pointer appearance-none rounded-lg border border-input bg-card px-3 py-2 pr-9 text-body text-foreground transition-colors hover:border-foreground/40 focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
    </div>
  ),
)
SelectNative.displayName = 'SelectNative'

export { SelectNative }
