# CareerVault — Smart Contract Rules (Hardhat / Solidity)

Binding for `contracts/`. This project holds the on-chain trust anchor only; the app
runs fine without it (the server's `BlockchainService` defaults to a local ledger — R7).

## Stack
- Hardhat 2 + `@nomicfoundation/hardhat-toolbox` (ethers v6, chai) · Solidity 0.8.24 · TypeScript (CommonJS).

## Canonical contract (R2)
`AnchorRegistry` is the only contract. Surface: `anchorRoot`, `batchAnchorRoots`,
`revokeDocument`, `batchRevokeDocuments`, `verifyRoot` (view), `isRevoked` (view),
`getAnchorCount`, `getRevokedCount`, owner + authorized-anchor access control. Do not
rename it or change the event signatures — the server's ethers adapter binds to them.

## Rules
- Keep it minimal: only 32-byte roots and revocation flags go on-chain; never store PII.
- `anchorRoot` reverts on a duplicate or zero root; `revokeDocument` is idempotent.
- Follow checks-effects-interactions; guard state changes with `onlyOwner`/`onlyAuthorized`.
- Every public/external function and event must have NatSpec.
- Every change ships with a passing test in `test/`. Run `npm test` before commit.
- Production owner should be a multisig; the deployer is the first authorized anchor.

## Commands
- `npm install` · `npm run compile` · `npm test`
- `npm run deploy:amoy` (needs `POLYGON_RPC_URL` + `ANCHOR_PRIVATE_KEY` in `.env`)
