import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        // border-input clears WCAG 1.4.11 (3.53:1) — the boundary is the only thing
        // identifying the control, so it cannot be a decorative hairline.
        'flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-body text-foreground transition-colors placeholder:text-subtle hover:border-foreground/40 focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
