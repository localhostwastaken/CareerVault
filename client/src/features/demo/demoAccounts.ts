// The accounts server/prisma/seed.ts creates, as the 16 Nov 2026 recorded take uses them.
// The deployed stack holds test accounts only; the team chose to show its seed password here
// so the live fallback can be run from this page alone.
export interface DemoAccount {
  email: string
  name: string
  role: string
  organization: string
  /** What this account does in the demo. */
  purpose: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'imperialsample+alice@gmail.com',
    name: 'Alice Holder',
    role: 'Holder',
    organization: '—',
    purpose: 'Requests the letter, shares it, talent profile',
  },
  {
    email: 'marcus@techcorp.example.com',
    name: 'Marcus Manager',
    role: 'Manager',
    organization: 'TechCorp',
    purpose: 'Drafts and signs, with step-up',
  },
  {
    email: 'hr@techcorp.example.com',
    name: 'Hannah HR',
    role: 'HR',
    organization: 'TechCorp',
    purpose: 'Co-signs and issues; revokes Bob’s letter',
  },
  {
    email: 'admin@techcorp.example.com',
    name: 'Olivia Admin',
    role: 'Org admin',
    organization: 'TechCorp',
    purpose: 'Anchor now, members, audit log',
  },
  {
    email: 'recruiter@techcorp.example.com',
    name: 'Riya Recruiter',
    role: 'Recruiter',
    organization: 'TechCorp',
    purpose: 'Finds candidates for her opening',
  },
  {
    email: 'bob@holder.example.com',
    name: 'Bob Holder',
    role: 'Holder',
    organization: '—',
    purpose: 'His issued letter is the one revoked',
  },
]

/** The deployed seed password (SEED_DEMO_PASSWORD in server/.env.production.local). */
export const DEPLOYED_SEED_PASSWORD = '0LcoBf0uKDeSANzv-Cv1'
/** The local-dev seed default (README). */
export const LOCAL_SEED_PASSWORD = 'Password123@'

/** Every seeded signer (Marcus, Hannah) enrols with the same step-up details. */
export const STEP_UP_DETAILS: { label: string; value: string }[] = [
  { label: 'Date of birth', value: '15/01/1990' },
  { label: 'Personal ID', value: 'DEMO-0001' },
  { label: 'First school', value: 'Somaiya' },
  { label: 'Birth city', value: 'Mumbai' },
  { label: 'First pet', value: 'Bruno' },
]
