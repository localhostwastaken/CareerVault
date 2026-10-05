import { KNOWN_REGISTRIES } from './amoyRpc.ts'
import type { CredentialAnchor } from './types.ts'

// Pure (no I/O): whether a credential's anchor names the registry THIS code pins. 'pending'
// means no anchor exists yet (nothing to check); 'na' means a chain that cannot be checked
// independently (the local simulator, or no contract address). Shared by the on-chain check
// (what to report) and the summary (what a pass is allowed to claim).
export type PinStatus = 'pending' | 'na' | 'unpinned' | 'matched' | 'mismatched'

export function registryPinStatus(anchor: CredentialAnchor | null): PinStatus {
  if (!anchor) return 'pending'
  if (anchor.chainId === null || !anchor.contractAddress) return 'na'
  const pin = KNOWN_REGISTRIES[anchor.chainId]
  if (!pin) return 'unpinned'
  return pin.toLowerCase() === anchor.contractAddress.toLowerCase() ? 'matched' : 'mismatched'
}
