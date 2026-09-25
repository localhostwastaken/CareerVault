import { Link, NavLink, Outlet } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const FOOTER_LINKS = [
  { label: 'Verify a document', to: '/verify' },
  { label: 'Sign in', to: '/auth/login' },
  { label: 'Create account', to: '/auth/register' },
]

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main"
        className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-label focus:font-semibold"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 lg:px-8">
          <Link to="/" className="focus-ring flex items-center gap-2 font-serif text-h2 text-foreground">
            <ShieldCheck className="size-5 text-seal" />
            CareerVault
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <NavLink
              to="/verify"
              className={({ isActive }) =>
                cn(
                  'focus-ring rounded-lg px-3 py-2 text-label font-medium transition-colors',
                  isActive ? 'text-seal' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              Verify
            </NavLink>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* At least a viewport tall (less the 4rem header), so the footer starts below the
          fold and a lazy page or a report replacing its loader never shoves it down in view. */}
      <main id="main" className="min-h-[calc(100vh-4rem)] flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <p className="flex items-center gap-2 font-serif text-h3 text-foreground">
              <ShieldCheck className="size-4 text-seal" />
              CareerVault
            </p>
            <p className="mt-1 text-label text-muted-foreground">
              Cryptographically signed career documents, anchored on a public ledger.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="focus-ring rounded-lg text-label text-muted-foreground transition-colors hover:text-seal"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}
