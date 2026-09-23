import { ConfigService } from '@nestjs/config';
import {
  Contract,
  type FeeData,
  JsonRpcProvider,
  type TransactionReceipt,
  Wallet,
} from 'ethers';
import {
  ANCHOR_REGISTRY_ABI,
  type AnchorRegistryContract,
  type FeeOverrides,
} from './anchor-registry.abi.js';

// The ethers plumbing behind PolygonAnchorService (R2): building its clients, pricing and
// confirming its transactions, encoding hashes for the registry, and keeping ethers' failure
// modes — uncaught subscription errors, request dumps carrying the RPC URL — inside it.

const BYTES32_HEX = /^[0-9a-fA-F]{64}$/;
const CACHE_LIMIT = 10_000;

export interface AnchorChain {
  provider: JsonRpcProvider;
  wallet: Wallet;
  contract: AnchorRegistryContract;
}

// staticNetwork: without it, an unreachable RPC makes ethers retry network detection (and
// log about it) forever. Construction does no I/O.
export function connectAnchorChain(config: ConfigService): AnchorChain {
  const get = (key: string) => config.getOrThrow<string>(key);
  const chainId = Number(get('ANCHOR_CHAIN_ID'));
  const opts = { staticNetwork: true };
  const provider = new JsonRpcProvider(get('POLYGON_RPC_URL'), chainId, opts);
  const wallet = new Wallet(get('ANCHOR_PRIVATE_KEY'), provider);
  const address = get('ANCHOR_REGISTRY_ADDRESS');
  const contract = new Contract(address, ANCHOR_REGISTRY_ABI, wallet);
  // Contract types every method as `any`; AnchorRegistryContract is the typed view.
  const registry = contract as unknown as AnchorRegistryContract;
  return { provider, wallet, contract: registry };
}

// ethers falls back to a 1 gwei tip on Amoy (no gas-station data), which Polygon PoS nodes
// reject. Both fields are set: given only the tip, ethers derives a max fee that can land
// below it.
export function feeOverrides(
  fee: Pick<FeeData, 'maxFeePerGas' | 'maxPriorityFeePerGas'>,
  tipFloor: bigint,
): FeeOverrides {
  const suggested = fee.maxPriorityFeePerGas ?? tipFloor;
  const tip = suggested > tipFloor ? suggested : tipFloor;
  const base = (fee.maxFeePerGas ?? 0n) - (fee.maxPriorityFeePerGas ?? 0n);
  return {
    maxPriorityFeePerGas: tip,
    maxFeePerGas: (base > 0n ? base : 0n) + tip,
  };
}

export interface ConfirmationPolicy {
  confirmations: number;
  timeoutMs: number;
  pollMs: number;
}

// Polled here instead of via tx.wait(): that waits through an ethers provider subscription
// whose poll errors nothing catches, so one failed receipt poll mid-wait is an
// unhandledRejection that takes the whole API down and prints the RPC URL, API key included.
// A failed poll here is simply retried until the deadline; its short form explains a timeout.
export async function waitForConfirmations(
  provider: Pick<JsonRpcProvider, 'getTransactionReceipt' | 'getBlockNumber'>,
  txHash: string,
  { confirmations, timeoutMs, pollMs }: ConfirmationPolicy,
): Promise<TransactionReceipt> {
  const deadline = Date.now() + timeoutMs;
  let lastError = '';
  for (;;) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      lastError = '';
      if (receipt) {
        const head = await provider.getBlockNumber();
        if (head - receipt.blockNumber + 1 >= confirmations) return receipt;
      }
    } catch (error) {
      lastError = ` (last RPC error: ${shortMessage(error)})`;
    }
    if (Date.now() >= deadline)
      throw new Error(
        `Timed out after ${timeoutMs} ms waiting for ${txHash} to confirm${lastError}`,
      );
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

export function toBytes32(hex: string): string {
  if (!BYTES32_HEX.test(hex))
    throw new Error('Expected a 32-byte hash as 64 hex characters');
  return `0x${hex.toLowerCase()}`;
}

// Map iterates in insertion order, so its first key is the oldest.
export function remember<V>(map: Map<string, V>, key: string, value: V): void {
  map.delete(key);
  if (map.size >= CACHE_LIMIT) map.delete(map.keys().next().value as string);
  map.set(key, value);
}

// ethers messages serialize the whole request, RPC URL included — and a hosted RPC URL
// carries its API key. Only the short form leaves this adapter, into logs or callers.
export function guard<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((error: unknown) => {
    throw new Error(shortMessage(error));
  });
}

export function shortMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'shortMessage' in error)
    return String(error.shortMessage);
  return error instanceof Error ? error.message : String(error);
}
