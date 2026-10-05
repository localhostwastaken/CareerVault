// Minimal Polygon Amoy JSON-RPC over fetch, so the browser check needs no ethers bundle and
// no CareerVault backend. Only public, CORS-enabled endpoints: a visitor's browser talks to
// the chain directly, which is the point — the answer can't be shaped by our servers.

export const AMOY_CHAIN_ID = 80002

// CareerVault's OFFICIAL AnchorRegistry deployments, pinned HERE rather than trusted from
// the credential file. Only CareerVault's authorized anchor wallet can write to ITS OWN
// registry, so pinning the address is what rules out a forger who deploys a look-alike
// AnchorRegistry and points anchor.contractAddress at it — verifyRoot() on ANY contract
// truthfully answers "yes" for whatever that contract was itself told to anchor. Same pin as
// tools/verify-credential (source-verified on PolygonScan; record: contracts/deployments/amoy.json).
export const KNOWN_REGISTRIES: Readonly<Record<number, string>> = {
  80002: '0x483f9FF4B7444c60e93808Ea0e9b72a14b8Cb12a',
}

// Links are built from this map plus a validated hash, never from the file's explorerTxUrl,
// which a forged file could point anywhere.
export const EXPLORER_BASE: Readonly<Record<number, string>> = {
  80002: 'https://amoy.polygonscan.com',
}

// Tried in order; both send `access-control-allow-origin: *`. (rpc-amoy.polygon.technology
// stopped resolving in Oct 2026.)
const RPC_ENDPOINTS = ['https://polygon-amoy-bor-rpc.publicnode.com', 'https://polygon-amoy.drpc.org']
const TIMEOUT_MS = 8000

let lastGood: string | null = null

// Host of the endpoint that answered the most recent call, for "read from <host>" UI copy.
export function lastRpcUsed(): string | null {
  return lastGood ? new URL(lastGood).host : null
}

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err))

async function callOnce(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body: unknown = await res.json()
  if (typeof body !== 'object' || body === null) throw new Error('malformed JSON-RPC response')
  if ('error' in body && body.error) {
    const err = body.error
    throw new Error(typeof err === 'object' && 'message' in err ? String(err.message) : 'RPC error')
  }
  if (!('result' in body)) throw new Error('JSON-RPC response has no result')
  return body.result
}

export async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  // The endpoint that last answered goes first, so one dead provider costs a single timeout
  // per page visit rather than one per call.
  const order = lastGood ? [lastGood, ...RPC_ENDPOINTS.filter((u) => u !== lastGood)] : RPC_ENDPOINTS
  let lastError = 'no endpoint tried'
  for (const url of order) {
    try {
      const result = await callOnce(url, method, params)
      lastGood = url
      return result
    } catch (err) {
      lastError = `${new URL(url).host}: ${message(err)}`
    }
  }
  throw new Error(`no Polygon Amoy RPC endpoint answered (last: ${lastError})`)
}

export function expectHex(value: unknown, what: string): string {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]*$/.test(value)) {
    throw new Error(`${what}: expected a hex string from the RPC`)
  }
  return value
}

export function assertAddress(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error(`invalid address ${address}`)
  return address
}

export async function getCode(address: string): Promise<string> {
  return expectHex(await rpcCall('eth_getCode', [assertAddress(address), 'latest']), 'eth_getCode')
}

export async function getBalance(address: string): Promise<bigint> {
  return BigInt(expectHex(await rpcCall('eth_getBalance', [assertAddress(address), 'latest']), 'eth_getBalance'))
}

export async function blockNumber(): Promise<number> {
  return Number(BigInt(expectHex(await rpcCall('eth_blockNumber', []), 'eth_blockNumber')))
}

// Truncates rather than rounds, so a balance is never shown higher than it really is.
export function formatPol(wei: bigint): string {
  const sign = wei < 0n ? '-' : ''
  const abs = wei < 0n ? -wei : wei
  const unit = 10n ** 18n
  const frac = ((abs % unit) / 10n ** 14n).toString().padStart(4, '0')
  return `${sign}${abs / unit}.${frac}`
}
