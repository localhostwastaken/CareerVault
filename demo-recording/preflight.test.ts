import assert from 'node:assert/strict'
import { test } from 'node:test'
import { preflight, type PreflightDeps } from './preflight.js'

// A take that starts against a sleeping Render instance, a paused Supabase project or an
// empty anchor wallet records minutes of spinners. Preflight must refuse to start instead.

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const WEI_0_05_POL = '0x' + (5n * 10n ** 16n).toString(16)
const WEI_0_004_POL = '0x' + (4n * 10n ** 15n).toString(16)

function deps(overrides: { health?: number; ai?: number; driver?: string; balanceHex?: string; rpcError?: boolean; resolves?: boolean } = {}): PreflightDeps {
  return {
    fetch: async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('ai-service')) return json({ status: 'ok' }, overrides.ai ?? 200)
      if (u.endsWith('/health')) return json({ success: true }, overrides.health ?? 200)
      if (u.endsWith('/health/status')) return json({ success: true, data: { blockchain: { driver: overrides.driver ?? 'amoy', walletAddress: '0xabc' } } })
      if (overrides.rpcError) return json({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'rate limited' } })
      return json({ jsonrpc: '2.0', id: 1, result: overrides.balanceHex ?? WEI_0_05_POL })
    },
    resolveHost: async () => overrides.resolves ?? true,
    healthTimeoutMs: 10,
    pollIntervalMs: 1,
    supabaseHost: 'project.supabase.co',
  }
}

test('refuses when the API never becomes healthy', async () => {
  const result = await preflight('prod', deps({ health: 503 }))
  assert.equal(result.ok, false)
  assert.match(result.ok ? '' : result.reason, /API/)
})

test('refuses a production take anchored on the local simulator', async () => {
  const result = await preflight('prod', deps({ driver: 'local' }))
  assert.equal(result.ok, false)
  assert.match(result.ok ? '' : result.reason, /simulator/)
})

test('refuses when the anchor wallet cannot pay for an anchor', async () => {
  const result = await preflight('prod', deps({ balanceHex: WEI_0_004_POL }))
  assert.equal(result.ok, false)
  assert.match(result.ok ? '' : result.reason, /balance/)
})

test('refuses when the Supabase project does not resolve (paused)', async () => {
  const result = await preflight('prod', deps({ resolves: false }))
  assert.equal(result.ok, false)
  assert.match(result.ok ? '' : result.reason, /Supabase/)
})

test('passes when everything is up', async () => {
  assert.deepEqual(await preflight('prod', deps()), { ok: true })
})

test('a local rehearsal only needs a healthy API', async () => {
  assert.deepEqual(await preflight('local', deps({ driver: 'local', resolves: false, balanceHex: '0x0' })), { ok: true })
})

test('names a paused Supabase project even though the API also looks down', async () => {
  const result = await preflight('prod', deps({ resolves: false, health: 503 }))
  assert.equal(result.ok, false)
  assert.match(result.ok ? '' : result.reason, /Supabase/)
})

test('refuses when the AI service does not wake (the last segment needs it)', async () => {
  const result = await preflight('prod', deps({ ai: 503 }))
  assert.equal(result.ok, false)
  assert.match(result.ok ? '' : result.reason, /AI service/)
})

test('reports an RPC error instead of crashing on the balance check', async () => {
  const result = await preflight('prod', deps({ rpcError: true }))
  assert.equal(result.ok, false)
  assert.match(result.ok ? '' : result.reason, /balance/)
})
