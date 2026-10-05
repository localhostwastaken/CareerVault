// The accounts server/prisma/seed.ts creates. Emails only: the deployed stack is seeded
// with a non-public SEED_DEMO_PASSWORD, so no password that opens it is ever printed here.
export interface DemoAccount {
  email: string
  name: string
  role: string
  organization: string
  /** What this account is for in the click path. */
  purpose: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'alice@holder.example.com',
    name: 'Alice Holder',
    role: 'Holder',
    organization: '—',
    purpose: 'Requests a document, downloads the proof file, shares it',
  },
  {
    email: 'marcus@techcorp.example.com',
    name: 'Marcus Manager',
    role: 'Manager',
    organization: 'TechCorp',
    purpose: 'Drafts and signs (first signature)',
  },
  {
    email: 'hr@techcorp.example.com',
    name: 'Hannah HR',
    role: 'HR',
    organization: 'TechCorp',
    purpose: 'Co-signs and issues; revokes',
  },
  {
    email: 'admin@techcorp.example.com',
    name: 'Olivia Admin',
    role: 'Org admin',
    organization: 'TechCorp',
    purpose: 'Runs “Anchor now”, members, audit log',
  },
  {
    email: 'gabriel@globalsolutions.example.com',
    name: 'Gabriel Manager',
    role: 'Manager',
    organization: 'GlobalSolutions',
    purpose: 'A second organisation, for cross-org checks',
  },
  {
    email: 'bob@holder.example.com',
    name: 'Bob Holder',
    role: 'Holder',
    organization: '—',
    purpose: 'A second holder',
  },
]

/** The local-dev seed default (README). It does not open the deployed accounts. */
export const LOCAL_SEED_PASSWORD = 'Password123@'
