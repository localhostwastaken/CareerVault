// Everything the take needs to know, in one place: where it runs, who signs in, the step-up
// values, and how long to hold on the screens the presenter will talk over.
export type Target = 'local' | 'prod'

export const TARGETS = {
  local: {
    app: 'http://localhost:5173',
    api: 'http://localhost:9900/api/v1',
    supabaseHost: null,
  },
  prod: {
    app: 'https://career-vault-steel.vercel.app',
    api: 'https://careervault-fsov.onrender.com/api/v1',
    // The Supabase project host. When the free project pauses, this name stops resolving.
    supabaseHost: process.env.SUPABASE_HOST ?? null,
  },
} as const

export const AMOY = {
  rpc: 'https://polygon-amoy-bor-rpc.publicnode.com',
  explorer: 'https://amoy.polygonscan.com',
  contract: '0x483f9FF4B7444c60e93808Ea0e9b72a14b8Cb12a',
  minBalancePol: 0.01,
}

export const ACCOUNTS = {
  alice: { email: 'imperialsample+alice@gmail.com', name: 'Alice Holder', role: 'Holder' },
  marcus: { email: 'marcus@techcorp.example.com', name: 'Marcus Manager', role: 'Manager · TechCorp' },
  hannah: { email: 'hr@techcorp.example.com', name: 'Hannah HR', role: 'HR · TechCorp' },
  olivia: { email: 'admin@techcorp.example.com', name: 'Olivia Admin', role: 'Org admin · TechCorp' },
  riya: { email: 'recruiter@techcorp.example.com', name: 'Riya Recruiter', role: 'Recruiter · TechCorp' },
  bob: { email: 'bob@holder.example.com', name: 'Bob Holder', role: 'Holder' },
} as const

// The public demo step-up values every seeded signer enrols with (server/prisma/seed.ts).
export const STEP_UP = {
  dateOfBirth: process.env.STEP_UP_DOB ?? '1990-01-15',
  personalId: process.env.STEP_UP_ID ?? 'DEMO-0001',
  answers: [
    process.env.STEP_UP_A1 ?? 'Somaiya',
    process.env.STEP_UP_A2 ?? 'Mumbai',
    process.env.STEP_UP_A3 ?? 'Bruno',
  ],
  wrongAnswer: 'Andheri',
}

export const GMAIL_SEARCH = 'https://mail.google.com/mail/u/0/#search/CareerVault'

// Milliseconds. "talk" holds are the screens the presenter explains; "beat" is a breath
// between actions so the viewer can follow the cursor.
export const HOLD = { beat: 900, read: 2_500, talk: 4_000 }
export const TYPE_DELAY_MS = 55

// The recorded browser window in screen points, browser chrome included: 16:9 so it scales
// cleanly to 1920×1080, and placed below the menu bar of a 1470×956-point MacBook screen.
export const WINDOW = { x: 0, y: 40, width: 1408, height: 792 }
