import { readFileSync } from 'node:fs'

// The demo password never goes through the shell: a production take reads it from the
// git-ignored server env file that seeded the accounts, and nothing the take prints may
// contain it.

export function redact(message: string, secrets: string[]): string {
  return secrets.filter(Boolean).reduce((text, secret) => text.split(secret).join('•'.repeat(8)), message)
}

const PROD_ENV = new URL('../server/.env.production.local', import.meta.url)

export function productionPassword(): string | null {
  try {
    const line = readFileSync(PROD_ENV, 'utf8').split('\n').find((l) => l.startsWith('SEED_DEMO_PASSWORD='))
    return line ? line.slice('SEED_DEMO_PASSWORD='.length).trim().replace(/^"|"$/g, '') : null
  } catch {
    return null
  }
}
