// Display helpers for on-chain references. Every explorer URL itself comes from the server
// (chain-explorer.ts), which only builds one for a chain with a public explorer; these
// helpers never invent a URL for a chain the server gave none for.

const NETWORK_LABEL: Record<string, string> = {
  'polygon-amoy': 'Polygon Amoy testnet',
  polygon: 'Polygon',
  'hardhat-local': 'Local Hardhat node',
  'local-simulator': 'Local simulator',
}

/** Human name for a server network id; an unlisted id is shown raw rather than guessed. */
export function networkLabel(network: string): string {
  return NETWORK_LABEL[network] ?? network
}

/** True for the JSON-ledger simulator, whose anchors no third party can check. */
export function isSimulatedNetwork(network: string): boolean {
  return network === 'local-simulator'
}

/**
 * A PolygonScan contract page opened on one of its tabs. "readContract" is where anyone can
 * call verifyRoot(0x…) themselves, straight against the chain rather than through us.
 */
export function contractTabUrl(contractUrl: string | null, tab: 'readContract' | 'events' | 'code'): string | null {
  return contractUrl ? `${contractUrl}#${tab}` : null
}

/** The registry takes roots and hashes as bytes32, which PolygonScan expects 0x-prefixed. */
export function toBytes32(hex: string): string {
  return hex.startsWith('0x') ? hex : `0x${hex}`
}
