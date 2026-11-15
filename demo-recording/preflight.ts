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

async function apiHealthy(api: string, deps: PreflightDeps): Promise<boolean> {
  const deadline = Date.now() + deps.healthTimeoutMs
  do {
    const ok = await deps.fetch(`${api}/health`, { signal: AbortSignal.timeout(60_000) }).then((r) => r.ok, () => false)
    if (ok) return true
    await new Promise((resolve) => setTimeout(resolve, deps.pollIntervalMs))
  } while (Date.now() < deadline)
  return false
}

async function walletBalancePol(wallet: string, deps: PreflightDeps): Promise<number> {
  const response = await deps.fetch(AMOY.rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [wallet, 'latest'] }),
  })
  const { result } = (await response.json()) as { result: string }
  return Number(BigInt(result)) / 1e18
}

// Refuses to start a take that would record a cold start, a paused database or an anchor
// that cannot be paid for. A local rehearsal only needs the API.
export async function preflight(target: Target, deps: PreflightDeps = realDeps): Promise<PreflightResult> {
  const { api } = TARGETS[target]
  const { supabaseHost } = deps
  if (!(await apiHealthy(api, deps))) return { ok: false, reason: `API at ${api} did not become healthy` }
  if (target === 'local') return { ok: true }

  if (supabaseHost && !(await deps.resolveHost(supabaseHost))) {
    return { ok: false, reason: 'Supabase project host does not resolve; restore the paused project first' }
  }
  const status = (await (await deps.fetch(`${api}/health/status`)).json()) as {
    data: { blockchain: { driver: string; walletAddress?: string } }
  }
  const chain = status.data.blockchain
  if (chain.driver !== 'amoy' || !chain.walletAddress) {
    return { ok: false, reason: `production anchors on the ${chain.driver} simulator, not Polygon Amoy` }
  }
  const balance = await walletBalancePol(chain.walletAddress, deps)
  if (balance < AMOY.minBalancePol) {
    return { ok: false, reason: `anchor wallet balance ${balance.toFixed(4)} POL is below ${AMOY.minBalancePol}` }
  }
  return { ok: true }
}
