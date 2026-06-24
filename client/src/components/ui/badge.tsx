import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Status variants map 1:1 to the fixed semantics. StatusBadge picks the right one.
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        neutral: 'bg-surface-2 text-muted-foreground',
        primary: 'bg-accent text-accent-foreground',
        verified: 'bg-verified-soft text-verified',
        pending: 'bg-pending-soft text-pending',
        revoked: 'bg-revoked-soft text-revoked',
        expired: 'bg-expired-soft text-expired',
        anchor: 'bg-anchor-soft text-anchor',
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
