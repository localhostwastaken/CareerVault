import { useState } from 'react'
import { Check, ChevronsUpDown, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth, usePersonas, useSwitchPersona, personaLabel } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function PersonaSwitcher() {
  const { role, user } = useAuth()
  const personas = usePersonas()
  const switchPersona = useSwitchPersona()
  const [open, setOpen] = useState(false)

  // Single persona — no need for a switcher.
  if (personas.length <= 1) return null

  const active = personas.find((p) => p.role === role && p.organizationId === (user?.memberships.find((m) => m.role === role)?.organizationId ?? null))
  const activeLabel = active ? personaLabel(active) : role

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" />
          <span className="hidden text-sm font-medium sm:inline max-w-[140px] truncate">{activeLabel}</span>
          <ChevronsUpDown className="size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Switch persona</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {personas.map((p) => {
          const label = personaLabel(p)
          const isActive = p.role === role
          return (
            <DropdownMenuItem
              key={`${p.role}:${p.organizationId ?? 'personal'}`}
              onSelect={() => { switchPersona(p); setOpen(false) }}
              className="gap-3"
            >
              <Check className={cn('size-4', isActive ? 'opacity-100' : 'opacity-0')} />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{label}</span>
                {p.role !== 'HOLDER' && (
                  <span className="text-xs text-muted-foreground">{p.role === 'ORG_ADMIN' ? 'Full access' : p.role === 'HR' ? 'Approve documents' : p.role === 'MANAGER' ? 'Sign documents' : 'Talent search'}</span>
                )}
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
