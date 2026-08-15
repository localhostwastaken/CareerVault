import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// Native input for correct semantics and keyboard behaviour; the visible box is a
// sibling span so the control still clears the 3:1 boundary contrast floor.
const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'peer size-4 cursor-pointer appearance-none rounded-sm border border-input bg-card transition-colors checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
      <Check className="pointer-events-none absolute size-3 text-primary-foreground opacity-0 peer-checked:opacity-100" />
    </span>
  ),
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
