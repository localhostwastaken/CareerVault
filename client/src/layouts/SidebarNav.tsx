import { NavLink } from 'react-router-dom'
import type { RoleConfig } from '@/lib/roles'
import { cn } from '@/lib/utils'

interface SidebarNavProps {
  config: RoleConfig
  /** Closes the mobile drawer after a jump. Unused on desktop. */
  onNavigate?: () => void
}

// Shared by the desktop sidebar and the mobile drawer so the two can never drift.
export function SidebarNav({ config, onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label={config.label} className="flex flex-1 flex-col gap-0.5 p-3">
      <p className="label-micro px-3 pb-2">{config.label}</p>
      {config.nav.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                // The active marker is a left rule plus ink weight, not colour alone.
                'focus-ring flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-label transition-colors',
                isActive
                  ? 'border-l-seal bg-accent font-semibold text-accent-foreground'
                  : 'border-l-transparent text-muted-foreground hover:bg-surface-2 hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('size-4 shrink-0', isActive ? 'text-seal' : 'text-subtle')} />
                {item.label}
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
