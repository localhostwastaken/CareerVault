import { lookup } from 'node:dns/promises'
import { AMOY, TARGETS, type Target } from './config.js'

export type PreflightResult = { ok: true } | { ok: false; reason: string }

export interface PreflightDeps {
  fetch: typeof fetch
  resolveHost: (host: string) => Promise<boolean>
  healthTimeoutMs: number
  pollIntervalMs: number
  /** Host of the production Supabase project, or null to skip the check. */
  supabaseHost: string | null
}

export const realDeps: PreflightDeps = {
  fetch,
  resolveHost: (host) => lookup(host).then(() => true, () => false),
  // Render's free tier can take ~5 minutes to boot from cold.
  healthTimeoutMs: 6 * 60_000,
  pollIntervalMs: 10_000,
  supabaseHost: TARGETS.prod.supabaseHost,
}

// Polls a health URL until it answers 200: Render's free tier can take minutes to boot.
async function healthy(url: string, deps: PreflightDeps): Promise<boolean> {
  const deadline = Date.now() + deps.healthTimeoutMs
  do {
    const ok = await deps.fetch(url, { signal: AbortSignal.timeout(60_000) }).then((r) => r.ok, () => false)
    if (ok) return true
    await new Promise((resolve) => setTimeout(resolve, deps.pollIntervalMs))
  } while (Date.now() < deadline)
  return false
}

async function walletBalancePol(wallet: string, deps: PreflightDeps): Promise<number | null> {
  const response = await deps.fetch(AMOY.rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [wallet, 'latest'] }),
  }).catch(() => null)
  const body = (await response?.json().catch(() => null)) as { result?: string } | null
  return typeof body?.result === 'string' ? Number(BigInt(body.result)) / 1e18 : null
}

// Refuses to start a take that would record a cold start, a paused database or an anchor
// that cannot be paid for. A local rehearsal only needs the API.
export async function preflight(target: Target, deps: PreflightDeps = realDeps): Promise<PreflightResult> {
  const { api, ai } = TARGETS[target]
  // A paused Supabase project makes the API hang at boot, so name that cause first rather
  // than waiting out the health timeout and blaming the API.
  if (target === 'prod' && deps.supabaseHost && !(await deps.resolveHost(deps.supabaseHost))) {
    return { ok: false, reason: 'Supabase project host does not resolve; restore the paused project first' }
  }
  if (!(await healthy(`${api}/health`, deps))) return { ok: false, reason: `API at ${api} did not become healthy` }
  if (target === 'local') return { ok: true }

  if (ai && !(await healthy(`${ai}/health`, deps))) {
    return { ok: false, reason: `AI service at ${ai} did not wake; talent search in the last segment needs it` }
  }
  const statusResponse = await deps.fetch(`${api}/health/status`, { signal: AbortSignal.timeout(60_000) }).catch(() => null)
  const status = (await statusResponse?.json().catch(() => null)) as {
    data?: { blockchain?: { driver: string; walletAddress?: string } }
  } | null
  const chain = status?.data?.blockchain
  if (!chain) return { ok: false, reason: 'could not read /health/status from the API' }
  if (chain.driver !== 'amoy' || !chain.walletAddress) {
    return { ok: false, reason: `production anchors on the ${chain.driver} simulator, not Polygon Amoy` }
  }
  const balance = await walletBalancePol(chain.walletAddress, deps)
  if (balance === null) return { ok: false, reason: 'could not read the anchor wallet balance from the Amoy RPC' }
  if (balance < AMOY.minBalancePol) {
    return { ok: false, reason: `anchor wallet balance ${balance.toFixed(4)} POL is below ${AMOY.minBalancePol}` }
  }
  return { ok: true }
}
