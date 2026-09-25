import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Deliberately NOT the dev ports. The suite is expected to run while someone has the normal
// dev stack up on 9900/5173, and it must never talk to that database or that key store.
export const API_PORT = 9901
export const CLIENT_PORT = 5273
export const API_BASE = `http://localhost:${API_PORT}/api/v1`
export const CLIENT_BASE = `http://localhost:${CLIENT_PORT}`

const E2E_DATABASE = 'careervault_e2e'

/**
 * Reuse the developer's Postgres credentials from server/.env but point at a separate
 * database. Requiring a second hand-maintained connection string is the kind of setup step
 * that quietly rots; deriving it means the suite runs wherever the app already runs.
 */
function readServerDatabaseUrl(): URL {
  const env = readFileSync(resolve(REPO_ROOT, 'server/.env'), 'utf8')
  const line = env.split('\n').find((l) => l.trim().startsWith('DATABASE_URL='))
  if (!line) {
    throw new Error('DATABASE_URL not found in server/.env — copy server/.env.example first.')
  }
  return new URL(line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, ''))
}

function withDatabase(url: URL, database: string): string {
  const next = new URL(url.toString())
  next.pathname = `/${database}`
  return next.toString()
}

export const serverDatabaseUrl = readServerDatabaseUrl()
/** Connection to the maintenance database, used only to CREATE the e2e one. */
export const ADMIN_DATABASE_URL = withDatabase(serverDatabaseUrl, 'postgres')
export const E2E_DATABASE_URL = withDatabase(serverDatabaseUrl, E2E_DATABASE)
export const E2E_DATABASE_NAME = E2E_DATABASE

const CHAIN_VARS = [
  'E2E_CHAIN_RPC_URL',
  'E2E_ANCHOR_REGISTRY_ADDRESS',
  'E2E_ANCHOR_PRIVATE_KEY',
] as const

/**
 * Opt-in chain mode (`npm run test:chain`, see README): with all three chain variables set,
 * the API anchors through the real PolygonAnchorService against that node — a local Hardhat
 * node, which is why confirmations drop to 1 and the Polygon tip floor to 0. Half a
 * configuration is refused rather than quietly falling back to the simulator, and so is
 * test:chain without one: a chain run that never touched a chain must not pass.
 */
function blockchainEnv(): Record<string, string> {
  const missing = CHAIN_VARS.filter((name) => !process.env[name])
  if (missing.length === CHAIN_VARS.length && !process.env.E2E_REQUIRE_CHAIN) {
    return { BLOCKCHAIN_DRIVER: 'local' }
  }
  if (missing.length > 0) {
    throw new Error(`Chain mode needs ${missing.join(', ')} — see e2e/README.md`)
  }
  return {
    BLOCKCHAIN_DRIVER: 'amoy',
    POLYGON_RPC_URL: process.env.E2E_CHAIN_RPC_URL!,
    ANCHOR_REGISTRY_ADDRESS: process.env.E2E_ANCHOR_REGISTRY_ADDRESS!,
    ANCHOR_PRIVATE_KEY: process.env.E2E_ANCHOR_PRIVATE_KEY!,
    ANCHOR_CHAIN_ID: process.env.E2E_CHAIN_ID ?? '31337',
    ANCHOR_CONFIRMATIONS: '1',
    ANCHOR_MIN_PRIORITY_FEE_GWEI: '0',
  }
}

/**
 * Environment for the API under test. Every adapter is on its local/mock driver, so nothing
 * here reaches the network: no SMTP, no payment provider, and no RPC unless chain mode is on.
 */
export const API_ENV: Record<string, string> = {
  NODE_ENV: 'test', // also disables rate limiting — see TestEnvThrottlerGuard
  PORT: String(API_PORT),
  CORS_ORIGIN: CLIENT_BASE,
  WORKER: 'false', // no cron mutating documents mid-run
  DATABASE_URL: E2E_DATABASE_URL,
  DIRECT_URL: E2E_DATABASE_URL,
  // Separate key store and PDF storage, so the suite can never disturb dev signing keys.
  STORAGE_LOCAL_DIR: './storage-e2e',
  KEY_MANAGEMENT_DRIVER: 'local',
  ...blockchainEnv(),
  PAYMENT_DRIVER: 'mock',
  EMAIL_DRIVER: 'console',
  STORAGE_DRIVER: 'local',
  DNS_DRIVER: 'local', // domain verification is bypassed, so no real DNS is needed
}
