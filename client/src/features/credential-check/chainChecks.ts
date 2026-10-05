import { AMOY_CHAIN_ID, KNOWN_REGISTRIES, lastRpcUsed } from './amoyRpc.ts'
import { isRevoked, receiptHasRootAnchored, verifyRoot } from './anchorRegistry.ts'
import { checkLine } from './checkLine.ts'
import { explorerTxUrl } from './explorerLinks.ts'
import { registryPinStatus } from './registryPinStatus.ts'
import type { CheckLine, Credential, CredentialAnchor } from './types.ts'

// Port of checkOnChain in tools/verify-credential. Registry compares anchor.contractAddress
// with a pin THIS code holds (see KNOWN_REGISTRIES); the on-chain reads then confirm the root,
// the revocation flag and the receipt. A mismatched pin stops before any RPC call: querying a
// contract already known not to be CareerVault's would only produce misleading passes.

export interface ChainResult {
  lines: CheckLine[]
  // What isRevoked() answered, or null when it was never asked — the summary needs it.
  revoked: boolean | null
  rpcUsed: string | null
}

type PublicAnchor = CredentialAnchor & { chainId: number; contractAddress: string }

// Display-only, and never the file's own anchor.network: that is untrusted text, and could put
// misleading trust language right next to a pass.
const NETWORK_NAMES: Readonly<Record<number, string>> = { 80002: 'polygon-amoy', 31337: 'hardhat-local' }
const networkLabel = (chainId: number): string => NETWORK_NAMES[chainId] ?? `chain ${chainId}`
const REGISTRY = "CareerVault's registry"

const local = (...lines: CheckLine[]): ChainResult => ({ lines, revoked: null, rpcUsed: null })
const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err))

async function readChain(documentHash: string, anchor: PublicAnchor, isPinned: boolean): Promise<ChainResult> {
  const result: ChainResult = { lines: [], revoked: null, rpcUsed: null }
  const { contractAddress, merkleRoot, txHash } = anchor
  try {
    const root = await verifyRoot(contractAddress, merkleRoot)
    result.rpcUsed = lastRpcUsed()
    const explain = [`verifyRoot(0x${merkleRoot}) -> exists=${root.exists}`]
    if (!root.exists) {
      result.lines.push(checkLine('on-chain-root', 'On-chain root', 'fail', 'root not found on-chain', explain))
      return result
    }
    const link = explorerTxUrl(anchor.chainId, txHash)
    const when = root.anchoredAt?.toISOString() ?? 'at an unknown time'
    const detail = `exists on ${networkLabel(anchor.chainId)}, anchored ${when}, anchored by ${root.anchoredBy}`
    result.lines.push(checkLine('on-chain-root', 'On-chain root', 'pass', detail + (link ? ` (${link})` : ''), explain))

    const flag = await isRevoked(contractAddress, documentHash)
    result.revoked = flag.revoked
    const on = flag.revokedAt?.toISOString() ?? 'an unknown date'
    result.lines.push(
      !flag.revoked
        ? checkLine('on-chain-revocation', 'On-chain revocation', 'pass', 'not revoked')
        : isPinned
          ? checkLine('on-chain-revocation', 'On-chain revocation', 'fail', `REVOKED on ${on} in ${REGISTRY}`)
          : checkLine(
              'on-chain-revocation',
              'On-chain revocation',
              'warn',
              `REVOKED on ${on} at an unpinned address — treat it as revoked`,
            ),
    )

    // A batch retry after a restart can record the anchor without its transaction. The root
    // itself was just confirmed above, so the missing hash alone is no reason to fail.
    if (!txHash) {
      const where = isPinned ? `in ${REGISTRY}` : 'at the address the file names (unpinned)'
      result.lines.push(
        checkLine(
          'on-chain-receipt',
          'On-chain receipt',
          'warn',
          `no transaction hash recorded; root confirmed ${where}`,
        ),
      )
      return result
    }
    result.lines.push(
      (await receiptHasRootAnchored(txHash, contractAddress, merkleRoot))
        ? checkLine('on-chain-receipt', 'On-chain receipt', 'pass', `tx ${txHash} contains RootAnchored for this root`)
        : checkLine(
            'on-chain-receipt',
            'On-chain receipt',
            'fail',
            `no RootAnchored log for this root in tx ${txHash}`,
          ),
    )
  } catch (err) {
    result.lines.push(checkLine('on-chain', 'On-chain', 'fail', `RPC error: ${errorMessage(err)}`))
  }
  return result
}

export async function checkOnChain(cred: Credential, checkChain: boolean): Promise<ChainResult> {
  const { anchor } = cred
  if (!anchor) return local(checkLine('on-chain', 'On-chain', 'warn', 'skipped — no anchor to check'))
  const { chainId, contractAddress } = anchor
  if (chainId === null) {
    return local(
      checkLine('on-chain', 'On-chain', 'warn', 'anchored on the local simulator — no public chain to check'),
    )
  }
  if (!contractAddress) return local(checkLine('on-chain', 'On-chain', 'fail', 'anchor.contractAddress missing'))

  const pinStatus = registryPinStatus(anchor)
  if (pinStatus === 'mismatched') {
    const detail = `${contractAddress} is not ${REGISTRY} (pinned: ${KNOWN_REGISTRIES[chainId]})`
    return local(checkLine('registry', 'Registry', 'fail', detail))
  }
  const registry =
    pinStatus === 'matched'
      ? checkLine('registry', 'Registry', 'pass', `${contractAddress} matches ${REGISTRY} for ${networkLabel(chainId)}`)
      : checkLine(
          'registry',
          'Registry',
          'warn',
          `not pinned for chain ${chainId} — nothing confirms it is ${REGISTRY}`,
        )
  // The pin comparison above is pure, so it still runs offline: a look-alike registry fails
  // even when the visitor skips the network.
  if (!checkChain) return local(registry, checkLine('on-chain', 'On-chain', 'warn', 'skipped (offline mode)'))
  if (chainId !== AMOY_CHAIN_ID) {
    return local(registry, checkLine('on-chain', 'On-chain', 'fail', `no default RPC for chainId ${chainId}`))
  }
  const read = await readChain(
    cred.proof.documentHash,
    { ...anchor, chainId, contractAddress },
    pinStatus === 'matched',
  )
  return { ...read, lines: [registry, ...read.lines] }
}
