import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Menu, ShieldCheck, X } from 'lucide-react'
import { SidebarNav } from '@/layouts/SidebarNav'
import type { RoleConfig } from '@/lib/roles'

// Below md the sidebar is hidden, which previously left the authenticated app with
// no navigation at all. Radix Dialog supplies the focus trap, Escape handling and
// scroll lock a drawer needs.
export function MobileNav({ config }: { config: RoleConfig }) {
  const [open, setOpen] = useState(false)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className="focus-ring inline-flex size-10 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-2 md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-20 bg-foreground/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 md:hidden" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-30 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left md:hidden">
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <span className="flex items-center gap-2 font-serif text-h2 text-foreground">
              <ShieldCheck className="size-5 text-seal" />
              CareerVault
            </span>
            <DialogPrimitive.Close
              className="focus-ring inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <SidebarNav config={config} onNavigate={() => setOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
