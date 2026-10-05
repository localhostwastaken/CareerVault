import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Compass, LogOut, ShieldCheck, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from '@/features/notification/components/NotificationBell'
import { PersonaSwitcher } from '@/features/auth/components/PersonaSwitcher'
import { useSignOut } from '@/features/auth/hooks'
import { MobileNav } from '@/layouts/MobileNav'
import { SidebarNav } from '@/layouts/SidebarNav'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_CONFIG } from '@/lib/roles'

export function PortalLayout() {
  const { user, role } = useAuth()
  const config = ROLE_CONFIG[role]
  const navigate = useNavigate()
  const signOut = useSignOut()

  const initials = (user?.fullName ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main"
        className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-label focus:font-semibold"
      >
        Skip to content
      </a>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
        <Link
          to="/app"
          className="focus-ring flex h-16 items-center gap-2 border-b border-border px-5 font-serif text-h2 text-foreground"
        >
          <ShieldCheck className="size-5 text-seal" />
          CareerVault
        </Link>
        <SidebarNav config={config} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-border bg-card px-4 lg:px-6">
          <MobileNav config={config} />
          <PersonaSwitcher />
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-micro tracking-normal text-primary-foreground">
                    {initials}
                  </span>
                  <span className="hidden max-w-32 truncate text-label font-medium sm:inline">{user?.fullName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="normal-case tracking-normal">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/app/profile')}>
                  <User />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/demo')}>
                  <Compass />
                  Demo guide
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => signOut()}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main id="main" className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
