import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnchorReceipt,
  BlockchainService,
  RootStatus,
} from './blockchain.service.js';

interface Ledger {
  height: number;
  anchors: Record<
    string,
    { count: number; txHash: string; blockNumber: number; anchoredAt: string }
  >;
  revocations: Record<string, string>;
}

// A persistent local stand-in for the Polygon AnchorRegistry — an append-only JSON
// ledger separate from the app DB, so the 6-step verification's on-chain checks are
// real against an independent record. DB status stays authoritative for revocation (R7).
@Injectable()
export class LocalAnchorService extends BlockchainService {
  private readonly logger = new Logger(LocalAnchorService.name);
  private readonly file: string;

  constructor(config: ConfigService) {
    super();
    this.file = join(
      config.get<string>('STORAGE_LOCAL_DIR') ?? './storage',
      'chain',
      'ledger.json',
    );
  }

  async anchorRoot(
    rootHashHex: string,
    documentCount: number,
  ): Promise<AnchorReceipt> {
    const ledger = await this.read();
    const blockNumber = ++ledger.height;
    const txHash = `0x${createHash('sha256').update(`${rootHashHex}:${blockNumber}`).digest('hex')}`;
    const anchoredAt = new Date();
    ledger.anchors[rootHashHex] = {
      count: documentCount,
      txHash,
      blockNumber,
      anchoredAt: anchoredAt.toISOString(),
    };
    await this.write(ledger);
    this.logger.log(
      `Anchored root ${rootHashHex.slice(0, 12)} block=${blockNumber}`,
    );
    return { txHash, blockNumber, anchoredAt };
  }

  async verifyRoot(rootHashHex: string): Promise<RootStatus> {
    const rec = (await this.read()).anchors[rootHashHex];
    return rec
      ? {
          exists: true,
          documentCount: rec.count,
          anchoredAt: new Date(rec.anchoredAt),
        }
      : { exists: false };
  }

  async revokeDocument(documentHashHex: string): Promise<AnchorReceipt> {
    const ledger = await this.read();
    const blockNumber = ++ledger.height;
    const txHash = `0x${createHash('sha256').update(`revoke:${documentHashHex}:${blockNumber}`).digest('hex')}`;
    const anchoredAt = new Date();
    ledger.revocations[documentHashHex] = anchoredAt.toISOString();
    await this.write(ledger);
    return { txHash, blockNumber, anchoredAt };
  }

  async isRevoked(
    documentHashHex: string,
  ): Promise<{ revoked: boolean; revokedAt?: Date }> {
    const at = (await this.read()).revocations[documentHashHex];
    return at ? { revoked: true, revokedAt: new Date(at) } : { revoked: false };
  }

  private async read(): Promise<Ledger> {
    if (!existsSync(this.file))
      return { height: 0, anchors: {}, revocations: {} };
    return JSON.parse(await readFile(this.file, 'utf8')) as Ledger;
  }

  private async write(ledger: Ledger): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(ledger, null, 2), 'utf8');
  }
}
