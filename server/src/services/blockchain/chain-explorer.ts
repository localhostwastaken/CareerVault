// Names the chain an anchor lives on, and links to it, for verifiers (verification page,
// downloadable credential, ops listing). Pure — feature modules use it without an SDK.
// A null chainId is the LocalAnchor simulator, which must never read as a public chain.

const NETWORK_NAMES: Record<number, string> = {
  80002: 'polygon-amoy',
  137: 'polygon',
  31337: 'hardhat-local',
};

// Only chains with a public block explorer get links; a Hardhat node has none.
const EXPLORERS: Record<number, string> = {
  80002: 'https://amoy.polygonscan.com',
  137: 'https://polygonscan.com',
};

export function networkName(chainId: number | null): string {
  if (chainId === null) return 'local-simulator';
  return NETWORK_NAMES[chainId] ?? `chain-${chainId}`;
}

export function explorerTxUrl(
  chainId: number | null,
  txHash: string | null,
): string | null {
  return explorerUrl(chainId, 'tx', txHash);
}

export function explorerAddressUrl(
  chainId: number | null,
  address: string | null,
): string | null {
  return explorerUrl(chainId, 'address', address);
}

export function explorerBlockUrl(
  chainId: number | null,
  blockNumber: number | null,
): string | null {
  return explorerUrl(chainId, 'block', blockNumber);
}

function explorerUrl(
  chainId: number | null,
  kind: 'tx' | 'address' | 'block',
  value: string | number | null,
): string | null {
  const base = chainId === null ? undefined : EXPLORERS[chainId];
  return base && value !== null ? `${base}/${kind}/${value}` : null;
}
