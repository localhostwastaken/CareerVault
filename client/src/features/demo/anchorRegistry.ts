import { assertAddress, expectHex, rpcCall } from './amoyRpc.ts'

// keccak256("isAuthorizedAnchor(address)"), precomputed so no keccak ships to the browser.
const IS_AUTHORIZED_ANCHOR_SELECTOR = '0xf95209d7'

// Whether `account` may write roots: the demo guide's pre-flight, the browser twin of the
// server's boot self-check (anchor-self-check.ts). The argument and the return value are
// single static 32-byte words, so the call is ABI-encoded by hand.
export async function isAuthorizedAnchor(contract: string, account: string): Promise<boolean> {
  const word = assertAddress(account).slice(2).toLowerCase().padStart(64, '0')
  const raw = expectHex(
    await rpcCall('eth_call', [{ to: assertAddress(contract), data: IS_AUTHORIZED_ANCHOR_SELECTOR + word }, 'latest']),
    'eth_call',
  )
  // An address with no contract (or one without this function) answers "0x".
  if (raw.length < 66) throw new Error('could not decode result data — not an AnchorRegistry?')
  return BigInt(`0x${raw.slice(2, 66)}`) !== 0n
}
