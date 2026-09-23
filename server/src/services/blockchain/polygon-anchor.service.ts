import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type ContractTransactionResponse,
  formatEther,
  type JsonRpcProvider,
  parseEther,
  parseUnits,
  type Wallet,
} from 'ethers';
import {
  type AnchorChain,
  connectAnchorChain,
  guard,
  remember,
  shortMessage,
  toBytes32,
} from './anchor-chain.util.js';
import {
  type AnchorRegistryContract,
  type FeeOverrides,
} from './anchor-registry.abi.js';
import {
  AnchorReceipt,
  BlockchainService,
  RootStatus,
} from './blockchain.service.js';
import { networkName } from './chain-explorer.js';

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
const LOW_BALANCE = parseEther('0.05');

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
  private readonly provider: JsonRpcProvider;
  private readonly wallet: Wallet;
  private readonly contract: AnchorRegistryContract;
  private writes: Promise<unknown> = Promise.resolve();
  private readonly submitted: [root: string, txHash: string][] = [];
  // Anchors are immutable, so a positive answer never goes stale.
  private readonly roots = new Map<string, RootStatus>();
  private readonly rootReads = new Map<string, Promise<RootStatus>>();
  // Revocation can still change; this only absorbs verification bursts.
  private readonly revocations = new Map<string, CachedRevocation>();

  constructor(
    config: ConfigService,
    clients: AnchorChain = connectAnchorChain(config),
  ) {
    super();
    const setting = (key: string) => Number(config.getOrThrow<number>(key));
    this.chainId = setting('ANCHOR_CHAIN_ID');
    this.confirmations = setting('ANCHOR_CONFIRMATIONS');
    const minTipGwei = String(setting('ANCHOR_MIN_PRIORITY_FEE_GWEI'));
    this.tipFloor = parseUnits(minTipGwei, 'gwei');
    this.txTimeoutMs = setting('ANCHOR_TX_TIMEOUT_MS');
    this.contractAddress = config.getOrThrow<string>('ANCHOR_REGISTRY_ADDRESS');
    this.provider = clients.provider;
    this.wallet = clients.wallet;
    this.contract = clients.contract;
  }

  // Not awaited: a slow or unreachable RPC must not hold up boot. Findings are only
  // logged — a misconfigured chain degrades anchoring, it does not take the API down.
  onModuleInit(): void {
    void this.selfCheck();
  }

  async selfCheck(): Promise<void> {
    const wallet = this.wallet.address;
    this.logger.log(
      `Anchoring to ${networkName(this.chainId)} (chainId ${this.chainId}) via AnchorRegistry ${this.contractAddress} from wallet ${wallet}`,
    );
    try {
      const rpcChainId = Number(await this.provider.send('eth_chainId', []));
      this.report(
        rpcChainId === this.chainId,
        `RPC chainId ${rpcChainId}, ANCHOR_CHAIN_ID ${this.chainId}`,
      );
      const code = await this.provider.getCode(this.contractAddress);
      this.report(code !== '0x', `contract code at ${this.contractAddress}`);
      const authorized = await this.contract.isAuthorizedAnchor(wallet);
      this.report(authorized, `wallet ${wallet} is an authorized anchor`);
      const balance = await this.provider.getBalance(wallet);
      const funds = `wallet balance ${formatEther(balance)} POL`;
      if (balance < LOW_BALANCE) this.logger.warn(`${funds} — below 0.05 POL`);
      else this.logger.log(funds);
    } catch (error) {
      this.logger.error(
        `Self-check could not reach the chain: ${shortMessage(error)} — anchors verify as pending until it does`,
      );
    }
  }

  async anchorRoot(
    root: string,
    documentCount: number,
  ): Promise<AnchorReceipt> {
    const bytes32 = toBytes32(root);
    return this.write(
      (fees) => this.contract.anchorRoot(bytes32, documentCount, fees),
      bytes32,
    );
  }

  async revokeDocument(documentHash: string): Promise<AnchorReceipt> {
    const bytes32 = toBytes32(documentHash);
    return this.write((fees) => this.contract.revokeDocument(bytes32, fees));
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

  async isRevoked(documentHash: string): Promise<Revocation> {
    const bytes32 = toBytes32(documentHash);
    const hit = this.revocations.get(bytes32);
    if (hit && Date.now() - hit.at < REVOCATION_TTL_MS) return hit.value;
    const [revoked, revokedAt] = await guard(this.contract.isRevoked(bytes32));
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
    const run = this.writes.then(async () => {
      const tx = await send(await this.fees());
      if (root) this.submitted.push([root, tx.hash]);
      this.logger.log(
        `Sent ${tx.hash}, awaiting ${this.confirmations} confirmation(s)`,
      );
      const receipt = await tx.wait(this.confirmations, this.txTimeoutMs);
      if (receipt?.status !== 1) throw new Error(`Tx ${tx.hash} reverted`);
      const block = await this.provider.getBlock(receipt.blockNumber);
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

  // ethers falls back to a 1 gwei tip on Amoy (no gas-station data), which Polygon PoS
  // nodes reject. Both fields are set: given only the tip, ethers derives a max fee that
  // can land below it.
  private async fees(): Promise<FeeOverrides> {
    const fee = await this.provider.getFeeData();
    const suggested = fee.maxPriorityFeePerGas ?? this.tipFloor;
    const tip = suggested > this.tipFloor ? suggested : this.tipFloor;
    const base = (fee.maxFeePerGas ?? 0n) - (fee.maxPriorityFeePerGas ?? 0n);
    const floored = base > 0n ? base : 0n;
    return { maxPriorityFeePerGas: tip, maxFeePerGas: floored + tip };
  }

  private async readRoot(root: string): Promise<RootStatus> {
    const [exists, record] = await this.contract.verifyRoot(root);
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
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (receipt?.status === 1)
        return { txHash, blockNumber: receipt.blockNumber };
    }
    return {};
  }

  private report(ok: boolean, what: string): void {
    if (ok) this.logger.log(`Self-check OK — ${what}`);
    else this.logger.error(`Self-check FAILED — ${what}`);
  }
}
