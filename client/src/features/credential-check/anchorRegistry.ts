import { assertAddress, expectHex, rpcCall } from './amoyRpc.ts'

// The three read-only AnchorRegistry calls the check makes, ABI-encoded by hand. Every
// argument and return value is a static 32-byte word, so a full ABI coder would add bundle
// weight and nothing else.

// keccak256 of each signature, precomputed with ethers.id(...) so no keccak ships to the browser.
const VERIFY_ROOT_SELECTOR = '0x83363bcf' // verifyRoot(bytes32)
const IS_REVOKED_SELECTOR = '0x4294857f' // isRevoked(bytes32)
const IS_AUTHORIZED_ANCHOR_SELECTOR = '0xf95209d7' // isAuthorizedAnchor(address)
const ROOT_ANCHORED_TOPIC = '0xeab437c5ee6f90e75abb8e8f688a46b43d963cddd68c980867e9c5e2b8cd2b06' // RootAnchored(bytes32,uint256,uint256,address)

const ADDRESS_MASK = (1n << 160n) - 1n

function bytes32(hex: string, what: string): string {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error(`${what} must be 32 bytes of hex without 0x`)
  return hex.toLowerCase()
}

async function readWords(contract: string, data: string, count: number): Promise<bigint[]> {
  const raw = expectHex(await rpcCall('eth_call', [{ to: assertAddress(contract), data }, 'latest']), 'eth_call')
  const body = raw.slice(2)
  // An address with no contract (or one without this function) answers "0x"; ethers reports
  // the same situation as a decode failure, so the CLI and this check fail alike.
  if (body.length < count * 64) throw new Error('could not decode result data — not an AnchorRegistry?')
  return Array.from({ length: count }, (_, i) => BigInt(`0x${body.slice(i * 64, (i + 1) * 64)}`))
}

const dateFromSeconds = (seconds: bigint): Date | null => (seconds === 0n ? null : new Date(Number(seconds) * 1000))

export interface RootRecord {
  exists: boolean
  documentCount: bigint
  anchoredAt: Date | null
  anchoredBy: string
}

// Return layout: (bool exists, AnchorRecord{rootHash, documentCount, anchoredAt, anchoredBy, exists}),
// a static tuple, so six inline words.
export async function verifyRoot(contract: string, rootHex: string): Promise<RootRecord> {
  const data = VERIFY_ROOT_SELECTOR + bytes32(rootHex, 'root')
  const [exists, , documentCount, anchoredAt, anchoredBy] = await readWords(contract, data, 6)
  return {
    exists: exists !== 0n,
    documentCount,
    anchoredAt: dateFromSeconds(anchoredAt),
    anchoredBy: `0x${(anchoredBy & ADDRESS_MASK).toString(16).padStart(40, '0')}`,
  }
}

export async function isRevoked(
  contract: string,
  documentHashHex: string,
): Promise<{ revoked: boolean; revokedAt: Date | null }> {
  const data = IS_REVOKED_SELECTOR + bytes32(documentHashHex, 'document hash')
  const [revoked, revokedAt] = await readWords(contract, data, 2)
  return { revoked: revoked !== 0n, revokedAt: dateFromSeconds(revokedAt) }
}

// Whether `account` may write roots: the demo guide's pre-flight, the browser twin of the
// server's boot self-check (anchor-self-check.ts).
export async function isAuthorizedAnchor(contract: string, account: string): Promise<boolean> {
  const word = assertAddress(account).slice(2).toLowerCase().padStart(64, '0')
  const [authorized] = await readWords(contract, IS_AUTHORIZED_ANCHOR_SELECTOR + word, 1)
  return authorized !== 0n
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

// This is what confirms the file's txHash is real: only a transaction that actually ran the
// registry's anchorRoot for THIS root carries a RootAnchored log from that address.
export async function receiptHasRootAnchored(txHash: string, contract: string, rootHex: string): Promise<boolean> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error(`invalid transaction hash ${txHash}`)
  const rootTopic = `0x${bytes32(rootHex, 'root')}`
  const receipt = await rpcCall('eth_getTransactionReceipt', [txHash])
  if (!isRecord(receipt) || !Array.isArray(receipt.logs)) return false
  return receipt.logs.some(
    (log: unknown) =>
      isRecord(log) &&
      typeof log.address === 'string' &&
      log.address.toLowerCase() === contract.toLowerCase() &&
      Array.isArray(log.topics) &&
      String(log.topics[0]).toLowerCase() === ROOT_ANCHORED_TOPIC &&
      String(log.topics[1]).toLowerCase() === rootTopic,
  )
}
