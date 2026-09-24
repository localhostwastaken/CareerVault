# verify-credential

Standalone, offline verifier for a CareerVault downloaded credential
(`GET /api/v1/documents/:id/credential`, a `.jsonld` file). It imports nothing from
`server/` — every check here is an independent re-implementation of the algorithms described
in the credential's own `schemes` and `verificationInstructions` fields, so a third party
could have written this file from the credential alone.

## Install

    npm install

## Usage

    node verify-credential.mjs <credential.json> [--rpc <url>] [--registry <address>] [--explain]
    node verify-credential.mjs --selftest

- `--explain` also prints the intermediate values each check computes (the canonical JSON,
  the signed statement, the folded Merkle root, …).
- `--rpc <url>` overrides the RPC endpoint used for the on-chain check. Required for any
  chain id without a built-in default (e.g. a local Hardhat node at chain id `31337`).
- `--registry <address>` pins the address that counts as CareerVault's official
  `AnchorRegistry` for this run — see "Registry pinning" below. Required for any chain id not
  already in `KNOWN_REGISTRIES` (every chain except a deployed Amoy).
- `--selftest` recomputes every vector in `test-vectors.json` with this script's own
  functions and exits 1 if any diverge from the stored expected value. No credential file or
  network access needed.

## What exit 0 proves — and does not

A `✓` on every line (On-chain's ⚠ aside — see below) means: the `credentialSubject` bytes are
exactly what was hashed; both the manager and HR signed a role-bound statement over that
hash, verifiably, under the key embedded in the file; that hash is included in the anchored
Merkle tree; and, once a chain is public, that the Merkle root exists in **CareerVault's own**
`AnchorRegistry` — not just some contract the file happens to name.

It does **not** prove that `issuer.publicKeyPem` belongs to the named organization. Nothing
in the file, or on chain, binds a key to a legal identity — anyone can build a credential
with their own key and any `issuer.name` they like, and every check will still pass. Closing
that gap needs an **out-of-band** step: compare the key fingerprint this script prints
against CareerVault's public verify page or the organization directly. The final summary
line restates exactly what that run proved, every time.

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
5. **Registry** — compares `anchor.contractAddress` against a pin **this script holds**
   (`KNOWN_REGISTRIES`, or `--registry`), never against anything from the file. See "Registry
   pinning" below. No pin available for the chain → ⚠, not ✗ (there is nothing to mismatch
   yet).
6. **On-chain** — calls `AnchorRegistry.verifyRoot` and `.isRevoked` on `anchor.chainId` via
   `anchor.contractAddress`, and confirms `anchor.txHash`'s receipt contains a matching
   `RootAnchored` log. Also prints the fingerprint of `issuer.publicKeyPem` and the
   registry's own `anchoredBy` address, for out-of-band comparison, and builds any explorer
   link itself from a hardcoded `(chainId → base URL)` map plus the on-chain `txHash` — it
   never prints the credential's own `anchor.explorerTxUrl`, which a forged file could point
   anywhere. A `null` chainId (CareerVault's local simulator) has no public chain to check,
   and prints ⚠ instead of attempting one.

Each check prints one line: `✓` pass, `✗` fail, or `⚠` informational (pending, unpinned,
revoked, or nothing independently checkable — none of these fail the run). The process exits
`0` only if nothing printed `✗`, otherwise `1`. A final summary line restates, in one
sentence, exactly what that exit code does and does not prove.

## Registry pinning

`KNOWN_REGISTRIES` in `verify-credential.mjs` hardcodes CareerVault's official
`AnchorRegistry` address per chain id — **this script's own pin, never anything read from the
credential file.** That is the whole fix for a specific forgery: without it, a forger can
deploy their own look-alike `AnchorRegistry`, anchor their own fabricated root to it, and
point `anchor.contractAddress` at it — `verifyRoot()` on *any* contract truthfully answers
"yes" for whatever that contract was itself told to anchor, so the On-chain check alone
cannot tell CareerVault's registry from an impostor's. Pinning the address can: only
CareerVault's authorized anchor wallet can write to CareerVault's **own** registry.

- `80002` (Polygon Amoy) starts as `null` in `KNOWN_REGISTRIES` — "not deployed yet" — and is
  filled in once CareerVault's real Amoy `AnchorRegistry` is deployed. Until then, an
  Amoy-anchored credential prints ⚠ **Registry** ("not pinned"), not ✗.
- `--registry <address>` pins (or overrides) the address for any chain in a single run — this
  is how a local Hardhat deployment (chain id `31337`, a fresh address every time a node is
  started) gets checked; see below.
- If a pin exists for the credential's chain and `anchor.contractAddress` does not match it
  (case-insensitive), **Registry** prints ✗ and the on-chain calls are skipped entirely —
  querying a contract already known not to be CareerVault's would only produce misleading ✓
  lines.

## test-vectors.json

The single source of truth shared with the server's own tests
(`server/src/common/utils/{crypto,merkle}.util.spec.ts`, which read this same file and
assert the server's utils reproduce it — this file gates both implementations). It was
generated once from those utils via a throwaway script (not committed) and should not be
hand-edited; regenerate it the same way if `crypto.util.ts` or `merkle.util.ts` ever change.
It holds:

- the RFC 8785 (JSON Canonicalization Scheme) number-formatting examples;
- **`keySortingRfc`** — the actual RFC 8785 §3.2.3 example: property names sort by UTF-16
  code unit, not Unicode code point. Its keys include an astral emoji (U+1F600) and a Hebrew
  presentation-form letter (U+FB33) specifically because a naive code-point sort gets that
  pair backwards; an ASCII-only object cannot catch that bug;
- **`keySortingReadmeExample`** — a *separate*, ASCII-only vector from the installed
  `canonicalize` package's own README (its `"source"` field says so explicitly — it is
  **not** from RFC 8785), kept for its own coverage of numeric-looking-string sorting
  (`"1" < "10" < "111"` lexicographically, not numerically) and case sensitivity;
- fixed `{ content, salt } → documentHash` and `{ documentHash, role, memberId } →
  statementHash` vectors;
- a Merkle root + one proof each for 1-, 3-, and 4-leaf trees.

Non-ASCII vector values are stored `\u`-escaped (not as raw UTF-8 bytes) so the file stays
pure ASCII and unambiguous on any terminal or editor — this matters most for `keySortingRfc`,
where a silently "normalized" combining character or surrogate pair would invalidate the test.

Signatures are intentionally **not** in this file — RSA key generation isn't deterministic,
so there is no fixed signature to pin. Signature verification is instead exercised by running
this verifier against a real, fully-signed credential (below).

## Trying it against a real credential

Run the server locally against the local blockchain simulator (the default), take a document
through request → sign → approve, run `POST /merkle/run` as an org admin, then download
`GET /api/v1/documents/:id/credential`:

    node verify-credential.mjs careervault-credential-<id>.jsonld --explain

Every check should print ✓ except **On-chain**, which prints ⚠ for a local-simulator anchor
(`anchor.chainId: null` — there is no public chain to check it against), and the summary line
says this document is NOT independently anchored.

To see a failure, copy the file, change any `credentialSubject` field, and run it again:
**Integrity** prints ✗ and the process exits 1.

## Proving the on-chain + registry checks against a real chain

This was run against a real local Hardhat node (never a public network) as part of this
tool's own fix-round validation — see `../../.superpowers/sdd/ly-final-hardening-tasks/task-7-report.md`
for the full transcript. To reproduce:

    # terminal 1 — a local chain (chainId 31337); leave it running
    cd contracts && npx hardhat node

    # terminal 2 — deploy, then anchor a real document through it
    cd contracts && npm run deploy:localhost
    # note the printed ANCHOR_REGISTRY_ADDRESS
    export E2E_CHAIN_RPC_URL=http://127.0.0.1:8545
    export E2E_ANCHOR_REGISTRY_ADDRESS=$(node -p "require('./deployments/localhost.json').address")
    # Hardhat's default account #0, which deployed the registry and so is an authorized
    # anchor. Public and well known: fine for a local node, never for a real network.
    export E2E_ANCHOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
    cd ../e2e && npm run test:chain
    # (or run the server directly in chain mode and drive request -> sign -> approve ->
    # /merkle/run yourself — see ../../e2e/README.md's "Chain mode" section)

    # then, from a downloaded credential for the anchored document:
    cd ../tools/verify-credential
    node verify-credential.mjs <chain-credential.json> \
      --rpc http://127.0.0.1:8545 \
      --registry "$E2E_ANCHOR_REGISTRY_ADDRESS" \
      --explain
    # -> all checks print ✓, including Registry and all three On-chain lines

    # then, to see the forgery case Registry pinning exists for:
    node verify-credential.mjs <chain-credential.json> \
      --rpc http://127.0.0.1:8545 \
      --registry 0x000000000000000000000000000000DeaDBeef
    # -> ✗ Registry (the real address is not the pinned one), exit 1, no RPC calls attempted

Stop the Hardhat node afterwards. Never point any of this at a public network, and never
read, print, or use the real `ANCHOR_PRIVATE_KEY` from `server/.env` or `contracts/.env` —
only the well-known Hardhat test key above.
