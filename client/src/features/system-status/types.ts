// Mirrors server/src/health/system-status.service.ts (GET /health/status): the public,
// non-secret description of where anchors go and how stored data is protected.
export interface SystemStatus {
  blockchain: {
    driver: 'amoy' | 'local'
    network: string
    chainId: number | null
    contractAddress: string | null
    walletAddress: string | null
    explorerContractUrl: string | null
    explorerWalletUrl: string | null
  }
  encryption: {
    strict: boolean
    scheme: string
    encryptedFields: string[]
  }
  ai: { configured: boolean }
  generatedAt: string
}
