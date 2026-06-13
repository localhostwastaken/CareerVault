// AnchorRegistry abstraction (R2). LocalAnchor (file-backed ledger) today,
// PolygonAmoy (ethers v6 + contract) later — selected by ConfigService.
export interface AnchorReceipt {
  txHash: string;
  blockNumber: number;
  anchoredAt: Date;
}

export interface RootStatus {
  exists: boolean;
  documentCount?: number;
  anchoredAt?: Date;
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
