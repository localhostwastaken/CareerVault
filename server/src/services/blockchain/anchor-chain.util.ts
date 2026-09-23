import { ConfigService } from '@nestjs/config';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import {
  ANCHOR_REGISTRY_ABI,
  type AnchorRegistryContract,
} from './anchor-registry.abi.js';

// The ethers plumbing behind PolygonAnchorService (R2): building its clients, encoding hashes
// for the registry, and keeping ethers' failure modes from leaking out of the adapter.

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
