import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type ContractTransactionResponse, parseUnits } from 'ethers';
import {
  type AnchorChain,
  connectAnchorChain,
  feeOverrides,
  guard,
  remember,
  shortMessage,
  toBytes32,
  waitForConfirmations,
} from './anchor-chain.util.js';
import type { FeeOverrides } from './anchor-registry.abi.js';
import { anchorSelfCheck } from './anchor-self-check.js';
import {
  AnchorReceipt,
  AnchorTx,
  BlockchainService,
  RootStatus,
} from './blockchain.service.js';

// R2: the real AnchorRegistry adapter (Polygon, ethers v6). R7: the DB stays authoritative
// for revocation, so the chain never fails a user-facing action — revocations are
// fire-and-forget, and an unreachable RPC degrades verification to "pending".
//
// Writes go out one at a time: one wallet, one nonce sequence. ethers' NonceManager is
// avoided on purpose — it bumps its nonce before gas estimation, so one failed estimate
// leaves a gap that every later transaction queues behind forever.

type Revocation = { revoked: boolean; revokedAt?: Date };
type CachedRevocation = { at: number; value: Revocation };

const REVOCATION_TTL_MS = 60_000;
// Amoy seals a block about every 2 s, so this checks roughly every other block.
const RECEIPT_POLL_MS = 3_000;

export class PolygonAnchorService
  extends BlockchainService
  implements OnModuleInit
{
  private readonly logger = new Logger(PolygonAnchorService.name);
  private readonly chainId: number;
  private readonly contractAddress: string;
  private readonly confirmations: number;
  private readonly tipFloor: bigint;
  private readonly txTimeoutMs: number;
  private readonly deployBlock?: number;
  private writes: Promise<unknown> = Promise.resolve();
  private readonly submitted: [root: string, txHash: string][] = [];
  // Anchors are immutable, so a positive answer never goes stale.
  private readonly roots = new Map<string, RootStatus>();
  private readonly rootReads = new Map<string, Promise<RootStatus>>();
  // Revocation can still change; this only absorbs verification bursts.
  private readonly revocations = new Map<string, CachedRevocation>();

  constructor(
    config: ConfigService,
    private readonly chain: AnchorChain = connectAnchorChain(config),
    private readonly pollMs = RECEIPT_POLL_MS,
  ) {
    super();
    const setting = (key: string) => Number(config.getOrThrow<number>(key));
    this.chainId = setting('ANCHOR_CHAIN_ID');
    this.confirmations = setting('ANCHOR_CONFIRMATIONS');
    const minTipGwei = String(setting('ANCHOR_MIN_PRIORITY_FEE_GWEI'));
    this.tipFloor = parseUnits(minTipGwei, 'gwei');
    this.txTimeoutMs = setting('ANCHOR_TX_TIMEOUT_MS');
    this.contractAddress = config.getOrThrow<string>('ANCHOR_REGISTRY_ADDRESS');
    // Joi reads an empty value as unset, but ConfigService then falls back to process.env's ''.
    const deployBlock = config.get<number | ''>('ANCHOR_REGISTRY_DEPLOY_BLOCK');
    if (deployBlock !== undefined && deployBlock !== '')
      this.deployBlock = Number(deployBlock);
  }

  // Not awaited: a slow or unreachable RPC must not hold up boot.
  onModuleInit(): void {
    void this.selfCheck();
  }

  selfCheck(): Promise<void> {
    const { chainId, contractAddress } = this;
    return anchorSelfCheck(
      this.chain,
      { chainId, contractAddress },
      this.logger,
    );
  }

  async anchorRoot(
    root: string,
    documentCount: number,
  ): Promise<AnchorReceipt> {
    const bytes32 = toBytes32(root);
    return this.write(
      (fees) => this.chain.contract.anchorRoot(bytes32, documentCount, fees),
      bytes32,
    );
  }

  async revokeDocument(documentHash: string): Promise<AnchorReceipt> {
    const bytes32 = toBytes32(documentHash);
    return this.write((fees) =>
      this.chain.contract.revokeDocument(bytes32, fees),
    );
  }

  async verifyRoot(root: string): Promise<RootStatus> {
    const bytes32 = toBytes32(root);
    const cached = this.roots.get(bytes32);
    if (cached) return cached;
    let read = this.rootReads.get(bytes32);
    if (!read) {
      read = guard(this.readRoot(bytes32)).finally(() =>
        this.rootReads.delete(bytes32),
      );
      this.rootReads.set(bytes32, read);
    }
    return read;
  }

  // From the registry's deploy block, not block 0: a log query over the whole chain is slow
  // and most hosted RPCs refuse it. A root is anchored once ("Root exists"), so one event.
  async findAnchorTx(root: string): Promise<AnchorTx | null> {
    const skip = (why: string) => {
      this.logger.warn(
        `Root ${root} is on-chain but was not sent by this process, and ${why}; the batch records no transaction hash for it`,
      );
      return null;
    };
    if (this.deployBlock === undefined)
      return skip('ANCHOR_REGISTRY_DEPLOY_BLOCK is unset');
    try {
      const { contract } = this.chain;
      const filter = contract.filters.RootAnchored(toBytes32(root));
      const [log] = await guard(contract.queryFilter(filter, this.deployBlock));
      if (!log) return skip('no RootAnchored event names it');
      return { txHash: log.transactionHash, blockNumber: log.blockNumber };
    } catch (error) {
      return skip(
        `looking up its RootAnchored event failed (${shortMessage(error)})`,
      );
    }
  }

  async isRevoked(documentHash: string): Promise<Revocation> {
    const bytes32 = toBytes32(documentHash);
    const hit = this.revocations.get(bytes32);
    if (hit && Date.now() - hit.at < REVOCATION_TTL_MS) return hit.value;
    const [revoked, revokedAt] = await guard(
      this.chain.contract.isRevoked(bytes32),
    );
    const value = revoked
      ? { revoked, revokedAt: new Date(Number(revokedAt) * 1000) }
      : { revoked };
    remember(this.revocations, bytes32, { at: Date.now(), value });
    return value;
  }

  // Only anchorRoot records its send under `root`: a single-leaf root IS that document's
  // hash, so a revocation recorded under it would pass for the anchoring transaction.
  private write(
    send: (fees: FeeOverrides) => Promise<ContractTransactionResponse>,
    root?: string,
  ): Promise<AnchorReceipt> {
    const { provider } = this.chain;
    const run = this.writes.then(async () => {
      const tx = await send(
        feeOverrides(await provider.getFeeData(), this.tipFloor),
      );
      if (root) this.submitted.push([root, tx.hash]);
      this.logger.log(
        `Sent ${tx.hash}, awaiting ${this.confirmations} confirmation(s)`,
      );
      const receipt = await waitForConfirmations(provider, tx.hash, {
        confirmations: this.confirmations,
        timeoutMs: this.txTimeoutMs,
        pollMs: this.pollMs,
      });
      if (receipt.status !== 1) throw new Error(`Tx ${tx.hash} reverted`);
      const block = await provider.getBlock(receipt.blockNumber);
      if (!block) throw new Error(`Block ${receipt.blockNumber} not found`);
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        anchoredAt: new Date(block.timestamp * 1000),
        chainId: this.chainId,
        contractAddress: this.contractAddress,
      };
    });
    this.writes = run.catch(() => undefined);
    return guard(run);
  }

  private async readRoot(root: string): Promise<RootStatus> {
    const [exists, record] = await this.chain.contract.verifyRoot(root);
    if (!exists) return { exists };
    const status: RootStatus = {
      exists,
      documentCount: Number(record.documentCount),
      anchoredAt: new Date(Number(record.anchoredAt) * 1000),
      chainId: this.chainId,
      contractAddress: this.contractAddress,
      ...(await this.landedTx(root)),
    };
    remember(this.roots, root, status);
    return status;
  }

  // After a wait-timeout and a resend, one send landed and the other reverted with "Root
  // exists" — report the one that landed.
  private async landedTx(root: string): Promise<Partial<RootStatus>> {
    for (const [sentFor, txHash] of this.submitted) {
      if (sentFor !== root) continue;
      const receipt = await this.chain.provider.getTransactionReceipt(txHash);
      if (receipt?.status === 1)
        return { txHash, blockNumber: receipt.blockNumber };
    }
    return {};
  }
}
