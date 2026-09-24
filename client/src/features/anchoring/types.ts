// Mirrors server/src/modules/merkle/merkle.service.ts (listBatches / BatchResult).
export interface AnchorBatch {
  id: string
  rootHash: string
  txHash: string | null
  blockNumber: number | null
  documentCount: number
  anchoredAt: string | null
  createdAt: string
  chainId: number | null
  contractAddress: string | null
  network: string
  explorerTxUrl: string | null
}

export interface AnchorRunResult {
  anchored: number
  rootHash: string | null
  txHash: string | null
}
