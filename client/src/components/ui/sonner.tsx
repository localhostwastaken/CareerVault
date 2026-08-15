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
        toast: 'group rounded-xl border border-rule-strong bg-card text-foreground shadow-overlay',
        title: 'text-label font-semibold',
        description: 'text-body text-muted-foreground',
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
