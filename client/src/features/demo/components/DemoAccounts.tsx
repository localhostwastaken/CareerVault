import { Link } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CopyButton } from '@/components/shared/CopyButton'
import { useSignOut } from '@/features/auth/hooks'
import {
  DEMO_ACCOUNTS,
  DEPLOYED_SEED_PASSWORD,
  LOCAL_SEED_PASSWORD,
  STEP_UP_DETAILS,
  type DemoAccount,
} from '@/features/demo/demoAccounts'
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
      <div className="flex flex-col gap-3">
        <h2 className="text-h2 text-foreground">Demo accounts</h2>
        <p className="flex items-center gap-1 text-body text-muted-foreground">
          Password, every account:{' '}
          <span className="tnum font-mono text-label text-foreground">{DEPLOYED_SEED_PASSWORD}</span>
          <CopyButton value={DEPLOYED_SEED_PASSWORD} label="Copy the password" className="size-6" />
        </p>
        <p className="text-label text-subtle">
          Local stack: <span className="tnum font-mono">{LOCAL_SEED_PASSWORD}</span>
        </p>
        <div className="inset-well flex flex-col gap-1.5 p-3">
          <p className="label-micro">Step-up details (Marcus and Hannah)</p>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-label">
            {STEP_UP_DETAILS.map((detail) => (
              <div key={detail.label} className="contents">
                <dt className="text-muted-foreground">{detail.label}</dt>
                <dd className="tnum font-mono text-foreground">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </div>
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
