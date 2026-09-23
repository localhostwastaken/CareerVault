import type { ContractTransactionResponse } from 'ethers';

// R2: the AnchorRegistry surface the server binds to, as a human-readable ABI. It is a copy
// of contracts/contracts/AnchorRegistry.sol rather than an import because the Docker build
// context excludes contracts/. Keep it byte-for-byte in step with the Solidity signatures:
// a drifted fragment still compiles here and only fails on-chain.
export const ANCHOR_REGISTRY_ABI = [
  'function anchorRoot(bytes32 rootHash, uint256 documentCount)',
  'function revokeDocument(bytes32 documentHash)',
  'function verifyRoot(bytes32 rootHash) view returns (bool exists, tuple(bytes32 rootHash, uint256 documentCount, uint256 anchoredAt, address anchoredBy, bool exists) record)',
  'function isRevoked(bytes32 documentHash) view returns (bool revoked, uint256 revokedAt)',
  'function isAuthorizedAnchor(address account) view returns (bool)',
  'event RootAnchored(bytes32 indexed rootHash, uint256 documentCount, uint256 anchoredAt, address indexed anchoredBy)',
  'event DocumentRevoked(bytes32 indexed documentHash, uint256 revokedAt, address indexed revokedBy)',
] as const;

export interface FeeOverrides {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

// Typed view of the ABI above — ethers' Contract types every method as `any` without
// TypeChain, whose output lives in contracts/ and so cannot be imported either.
export interface AnchorRegistryContract {
  anchorRoot(
    rootHash: string,
    documentCount: number,
    overrides: FeeOverrides,
  ): Promise<ContractTransactionResponse>;
  revokeDocument(
    documentHash: string,
    overrides: FeeOverrides,
  ): Promise<ContractTransactionResponse>;
  verifyRoot(
    rootHash: string,
  ): Promise<[boolean, { documentCount: bigint; anchoredAt: bigint }]>;
  isRevoked(documentHash: string): Promise<[boolean, bigint]>;
  isAuthorizedAnchor(account: string): Promise<boolean>;
}
