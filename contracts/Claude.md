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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
