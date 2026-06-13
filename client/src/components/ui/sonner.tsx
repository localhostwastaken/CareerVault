import type { ComponentProps } from 'react'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = ComponentProps<typeof Sonner>

// Themed toast surface. Use the helpers in hooks/useApiError or sonner's `toast`
// directly; visuals are locked to our tokens here.
const Toaster = (props: ToasterProps) => (
  <Sonner
    position="top-right"
    toastOptions={{
      classNames: {
        toast: 'group rounded-xl border border-border bg-card text-foreground shadow-overlay',
        title: 'text-sm font-semibold',
        description: 'text-sm text-muted-foreground',
        actionButton: 'rounded-lg bg-primary text-primary-foreground',
        cancelButton: 'rounded-lg bg-surface-2 text-foreground',
        error: 'text-revoked',
        success: 'text-verified',
      },
    }}
    {...props}
  />
)

export { Toaster }
