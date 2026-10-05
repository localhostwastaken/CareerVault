import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENCRYPTED_FIELDS } from '../prisma/encryption/encrypted-fields.js';
import { BlockchainService } from '../services/blockchain/blockchain.service.js';
import {
  explorerAddressUrl,
  networkName,
} from '../services/blockchain/chain-explorer.js';

// Public trust configuration for the demo UI: where Merkle roots are anchored (R2) and
// how stored fields are protected (R10). It is served unauthenticated, so it carries only
// what is already public on-chain or in the repo. The RPC URL (it can embed an API key),
// the anchor private key and KMS_MASTER_KEY are never read here, and the wallet address
// comes from the blockchain adapter so ethers stays inside services/blockchain/.

const ENVELOPE_SCHEME = 'AES-256-GCM envelope (cvenc:v1)';

export interface SystemStatus {
  blockchain: {
    driver: 'amoy' | 'local';
    network: string;
    chainId: number | null;
    contractAddress: string | null;
    walletAddress: string | null;
    explorerContractUrl: string | null;
    explorerWalletUrl: string | null;
  };
  encryption: {
    strict: boolean;
    scheme: typeof ENVELOPE_SCHEME;
    encryptedFields: string[];
  };
  ai: { configured: boolean };
  generatedAt: string;
}

// Derived, not restated: a field added to ENCRYPTED_FIELDS shows up here unprompted.
const ENCRYPTED_FIELD_LIST = Object.entries(ENCRYPTED_FIELDS).flatMap(
  ([model, fields]) => fields.map((field) => `${model}.${field}`),
);

@Injectable()
export class SystemStatusService {
  constructor(
    private readonly config: ConfigService,
    private readonly blockchain: BlockchainService,
  ) {}

  status(): SystemStatus {
    const { chainId, contractAddress, walletAddress } =
      this.blockchain.describe();
    const aiUrl = this.config.get<string>('AI_SERVICE_URL');
    return {
      blockchain: {
        driver:
          this.config.get<'amoy' | 'local'>('BLOCKCHAIN_DRIVER') ?? 'local',
        network: networkName(chainId),
        chainId,
        contractAddress,
        walletAddress,
        explorerContractUrl: explorerAddressUrl(chainId, contractAddress),
        explorerWalletUrl: explorerAddressUrl(chainId, walletAddress),
      },
      encryption: {
        // Same source the Prisma extension is built from (prisma.module.ts).
        strict: this.config.get<boolean>('FIELD_ENCRYPTION_STRICT') === true,
        scheme: ENVELOPE_SCHEME,
        encryptedFields: [...ENCRYPTED_FIELD_LIST],
      },
      ai: { configured: typeof aiUrl === 'string' && aiUrl.trim() !== '' },
      generatedAt: new Date().toISOString(),
    };
  }
}
