# verify-credential

Standalone, offline verifier for a CareerVault downloaded credential
(`GET /api/v1/documents/:id/credential`, a `.jsonld` file). It imports nothing from
`server/` — every check here is an independent re-implementation of the algorithms described
in the credential's own `schemes` and `verificationInstructions` fields, so a third party
could have written this file from the credential alone.

## Install

    npm install

## Usage

    node verify-credential.mjs <credential.json> [--rpc <url>] [--explain]
    node verify-credential.mjs --selftest

- `--explain` also prints the intermediate values each check computes (the canonical JSON,
  the signed statement, the folded Merkle root, …).
- `--rpc <url>` overrides the RPC endpoint used for the on-chain check. Required for any
  chain id without a built-in default (e.g. a local Hardhat node at chain id `31337`).
- `--selftest` recomputes every vector in `test-vectors.json` with this script's own
  functions and exits 1 if any diverge from the stored expected value. No credential file or
  network access needed.

## What it checks, in order

1. **Integrity** — `SHA-256( JCS(credentialSubject) + proof.salt )` must equal
   `proof.documentHash`.
2. **Manager signature** — recomputes the statement
   `SHA-256(JCS({v:1, documentHash, role:'MANAGER', memberId: proof.signerMemberId}))` and
   verifies `proof.managerSignature` (RS256) over it with `issuer.publicKeyPem`.
3. **HR signature** — same, with role `HR` and `proof.approverMemberId` /
   `proof.hrSignature`.
4. **Merkle** — folds `anchor.proofPath` from `proof.documentHash` up to a root
   (`sha256(min(a,b) ‖ max(a,b))`, pairs sorted bytewise, position not trusted) and compares
   it to `anchor.merkleRoot`. No anchor yet → ⚠ pending.
5. **On-chain** — calls `AnchorRegistry.verifyRoot` and `.isRevoked` on `anchor.chainId` via
   `anchor.contractAddress`, and confirms `anchor.txHash`'s receipt contains a matching
   `RootAnchored` log. A `null` chainId (CareerVault's local simulator) has no public chain
   to check, and prints ⚠ instead of attempting one.

Each check prints one line: `✓` pass, `✗` fail, or `⚠` informational (pending, revoked, or
nothing independently checkable — none of these fail the run). The process exits `0` only if
nothing printed `✗`, otherwise `1`.

## test-vectors.json

The single source of truth shared with the server's own tests
(`server/src/common/utils/{crypto,merkle}.util.spec.ts`, which read this same file and
assert the server's utils reproduce it — this file gates both implementations). It was
generated once from those utils via a throwaway script (not committed) and should not be
hand-edited; regenerate it the same way if `crypto.util.ts` or `merkle.util.ts` ever change.
It holds:

- the RFC 8785 (JSON Canonicalization Scheme) number-formatting and property-sorting
  examples the server's `canonicalize` dependency must reproduce;
- fixed `{ content, salt } → documentHash` and `{ documentHash, role, memberId } →
  statementHash` vectors;
- a Merkle root + one proof each for 1-, 3-, and 4-leaf trees.

Signatures are intentionally **not** in this file — RSA key generation isn't deterministic,
so there is no fixed signature to pin. Signature verification is instead exercised by running
this verifier against a real, fully-signed credential (below).

## Trying it against a real credential

Run the server locally against the local blockchain simulator (the default), take a document
through request → sign → approve, run `POST /merkle/run` as an org admin, then download
`GET /api/v1/documents/:id/credential`:

    node verify-credential.mjs careervault-credential-<id>.jsonld --explain

Every check should print ✓ except **On-chain**, which prints ⚠ for a local-simulator anchor
(`anchor.chainId: null` — there is no public chain to check it against).

To see a failure, copy the file, change any `credentialSubject` field, and run it again:
**Integrity** prints ✗ and the process exits 1.

## Optional: a real on-chain check

**On-chain** can be exercised against a real `AnchorRegistry` deployment on a local Hardhat
node (never a public network) — see `../../e2e/README.md`'s "Chain mode" section for
starting Hardhat, deploying, and pointing the server at it via the `E2E_*` env vars. Once a
document is anchored that way, run:

    node verify-credential.mjs <credential.json> --rpc http://127.0.0.1:8545

Chain id `31337` (Hardhat) has no built-in default RPC, so `--rpc` is required.
