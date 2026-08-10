import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Status variants map 1:1 to the fixed semantics. StatusBadge picks the right one.
// Every variant pairs a soft ground with its own ink at >=4.5:1 — a badge is text,
// so it is held to text contrast, not the 3:1 graphics floor.
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro uppercase [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        neutral: 'border-rule-strong/60 bg-surface-2 text-muted-foreground',
        primary: 'border-seal/20 bg-accent text-accent-foreground',
        verified: 'border-verified/25 bg-verified-soft text-verified',
        pending: 'border-pending/25 bg-pending-soft text-pending',
        revoked: 'border-revoked/25 bg-revoked-soft text-revoked',
        expired: 'border-expired/25 bg-expired-soft text-expired',
        anchor: 'border-anchor/25 bg-anchor-soft text-anchor',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
