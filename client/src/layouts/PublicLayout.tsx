import { Link, Outlet } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
          <ShieldCheck className="size-5 text-primary" />
          CareerVault
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/verify">Verify a document</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/auth/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth/register">Get started</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
