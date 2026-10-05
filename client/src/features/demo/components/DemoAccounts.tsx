import { Link } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CopyButton } from '@/components/shared/CopyButton'
import { useSignOut } from '@/features/auth/hooks'
import { DEMO_ACCOUNTS, LOCAL_SEED_PASSWORD, type DemoAccount } from '@/features/demo/demoAccounts'
import { useAuth } from '@/hooks/useAuth'

const loginPath = (email: string) => `/auth/login?email=${encodeURIComponent(email)}`

function SignInAs({ account }: { account: DemoAccount }) {
  const { user } = useAuth()
  const signOut = useSignOut()

  if (user?.email === account.email) return <Badge variant="primary">Signed in</Badge>
  // Signed in as someone else: the login route would bounce straight back to the portal,
  // so switching accounts signs the current one out first.
  if (user) {
    return (
      <Button variant="outline" size="sm" onClick={() => signOut(loginPath(account.email))}>
        <LogIn />
        Switch to this account
      </Button>
    )
  }
  return (
    <Button asChild variant="outline" size="sm">
      <Link to={loginPath(account.email)}>
        <LogIn />
        Sign in as
      </Link>
    </Button>
  )
}

export function DemoAccounts() {
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-h2 text-foreground">Demo accounts</h2>
        <p className="mt-0.5 text-body text-muted-foreground">
          Seeded by <span className="font-mono text-label">npm run db:seed</span>. Locally the password is{' '}
          <span className="tnum font-mono text-label text-foreground">{LOCAL_SEED_PASSWORD}</span>. The deployed demo
          uses the team&rsquo;s private seed password instead.
        </p>
      </div>
      <ul className="flex flex-col">
        {DEMO_ACCOUNTS.map((account) => (
          <li
            key={account.email}
            className="flex flex-col gap-3 border-b border-border py-3 last:border-b-0 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-label font-semibold text-foreground">
                {account.name} <span className="font-normal text-muted-foreground">· {account.role}</span>
                {account.organization !== '—' && (
                  <span className="font-normal text-muted-foreground"> at {account.organization}</span>
                )}
              </p>
              <p className="flex min-w-0 items-center gap-1">
                <span className="tnum truncate font-mono text-micro text-muted-foreground">{account.email}</span>
                <CopyButton value={account.email} label={`Copy ${account.email}`} className="size-6" />
              </p>
              <p className="text-label text-subtle">{account.purpose}</p>
            </div>
            <div className="shrink-0">
              <SignInAs account={account} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
