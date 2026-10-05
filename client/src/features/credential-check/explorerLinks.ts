import { EXPLORER_BASE } from './amoyRpc.ts'

// Built from the hardcoded explorer map plus a hash that must LOOK like a hash, never from the
// file's own explorerTxUrl: a forged file could point that link anywhere. A well-formed link
// still only proves the hash was written down — the receipt check is what proves it is real.

export function explorerTxUrl(chainId: number | null, txHash: string | null): string | null {
  const base = chainId === null ? undefined : EXPLORER_BASE[chainId]
  return base && txHash && /^0x[0-9a-fA-F]{64}$/.test(txHash) ? `${base}/tx/${txHash}` : null
}

export function explorerAddressUrl(chainId: number | null, address: string | null): string | null {
  const base = chainId === null ? undefined : EXPLORER_BASE[chainId]
  return base && address && /^0x[0-9a-fA-F]{40}$/.test(address) ? `${base}/address/${address}` : null
}
