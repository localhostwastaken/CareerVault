// AnchorRegistry abstraction (R2). LocalAnchor (a JSON-ledger simulator) and PolygonAnchor
// (ethers v6 against the deployed contract), selected by BLOCKCHAIN_DRIVER.
export interface AnchorReceipt {
  txHash: string;
  blockNumber: number;
  anchoredAt: Date;
  // Null for the local simulator: there is no chain or contract a verifier could check.
  chainId: number | null;
  contractAddress: string | null;
}

export interface RootStatus {
  exists: boolean;
  documentCount?: number;
  anchoredAt?: Date;
  // Where a positive answer was read from, so a root recorded by a retry (not by its own
  // anchoring call) is still attributed to the right chain.
  chainId?: number | null;
  contractAddress?: string | null;
  // Only when THIS process submitted the root: lets a retry after a wait-timeout record
  // the transaction that landed.
  txHash?: string;
  blockNumber?: number;
}

export abstract class BlockchainService {
  abstract anchorRoot(
    rootHashHex: string,
    documentCount: number,
  ): Promise<AnchorReceipt>;
  abstract verifyRoot(rootHashHex: string): Promise<RootStatus>;
  abstract revokeDocument(documentHashHex: string): Promise<AnchorReceipt>;
  abstract isRevoked(
    documentHashHex: string,
  ): Promise<{ revoked: boolean; revokedAt?: Date }>;
}
