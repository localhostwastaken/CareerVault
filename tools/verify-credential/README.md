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
- `--registry <address>` pins the address that counts as the credential's official
  `AnchorRegistry` for this run — see "Registry pinning" below. Required for any chain id not
  already in `KNOWN_REGISTRIES` (every chain except a deployed Amoy). Must be a syntactically
  valid `0x` address (`ethers.isAddress`); a missing, empty, or invalid value is a **usage
  error** (exit `2`), not "no override" — silently falling back to "unpinned" here would let
  a broken wrapper script quietly defeat the one check that makes a forged
  `anchor.contractAddress` detectable.
- `--selftest` recomputes every vector in `test-vectors.json` with this script's own
  functions and exits 1 if any diverge from the stored expected value. No credential file or
  network access needed.

## What exit 0 proves — and does not

A fully anchored, fully pinned credential printing `✓` on every line means: the
`credentialSubject` bytes are exactly what was hashed; both role-bound signatures verify
under the embedded issuer key (they are **one** org key used for two distinct, role-bound
statements — not one key per signer); that hash is included in the anchored Merkle tree; and
— **only** because the registry was pinned, either built in or via `--registry` — that the
Merkle root exists in that specific `AnchorRegistry`, not just some contract the file happens
to name, and that the registry does not record the document as revoked. Exit 0 is also
reached, with fewer `✓`s, in the narrower cases the final summary line spells out every time:

- **Not yet anchored** (`anchor: null` — true of every issued document until the next
  anchoring batch runs; see `credential.builder.ts`): only Integrity and the two signatures
  are checked. There is no Merkle proof and no on-chain evidence at all yet — the summary
  says so explicitly, with a `⚠`, not a `✓`.
- **Anchored but unpinned, or on the local simulator**: Merkle inclusion is proven, but
  nothing ties the root to a *specific, known* registry (unpinned chain) or to any public
  chain at all (`anchor.chainId: null`, CareerVault's local simulator).
- **No transaction hash recorded** (`anchor.txHash: null`): a batch that retried after a
  restart can record the anchor without its transaction when the server can't look it up.
  The root itself is still confirmed with `verifyRoot`, so the receipt line is `⚠`, not `✗`.

It does **not**, ever, prove that `issuer.publicKeyPem` belongs to the named organization.
Nothing in the file, or on chain, binds a key to a legal identity — anyone can build a
credential with their own key and any `issuer.name` they like, and every check will still
pass. Closing that gap needs an **out-of-band** step: get the issuer key fingerprint from the
organization directly, or look up `proof.documentHash` on CareerVault's public verify page
(`/verify/hash/<documentHash>`) and confirm it names the same organization and verdict. The
final summary line restates exactly this, every run, with the real `documentHash` filled in.

**A revoked credential exits 1**, and its summary line starts `✗ REVOKED`, in two cases:

- the file's own `revocation` block is filled in (CareerVault fills it once the document is
  `REVOKED`, a terminal status); or
- the registry is pinned and `isRevoked` says so. Only CareerVault's authorized wallet can
  write that registry's revocation flag, and nothing can clear it, so the answer is
  conclusive.

A revocation found at an **unpinned** address only warns (`⚠`, exit 0): nothing says that
contract is CareerVault's. The summary then starts with `REVOKED ON-CHAIN` and says to treat
the document as revoked. One case stays invisible offline: the server writes the on-chain flag
fire-and-forget after the database revocation, and nothing retries a write that failed, so a
revoked document can have no flag. The public verify page, which reads the database, still
shows it as `REVOKED`.

## What it checks, in order

1. **Integrity** — `SHA-256( JCS(credentialSubject) + proof.salt )` must equal
   `proof.documentHash`.
2. **Manager signature** — recomputes the statement
   `SHA-256(JCS({v:1, documentHash, role:'MANAGER', memberId: proof.signerMemberId}))` and
   verifies `proof.managerSignature` (RS256) over it with `issuer.publicKeyPem`.
3. **HR signature** — same, with role `HR` and `proof.approverMemberId` /
   `proof.hrSignature`. (2 and 3 verify under the same single embedded key — see above.)
   **Revocation** — printed only when the file carries a `revocation` block, and then always
   ✗: a credential that says it was revoked must never pass. A missing block proves nothing
   either way, so it prints no line.
4. **Merkle** — folds `anchor.proofPath` from `proof.documentHash` up to a root
   (`sha256(min(a,b) ‖ max(a,b))`, pairs sorted bytewise, position not trusted) and compares
   it to `anchor.merkleRoot`. No anchor yet → ⚠ pending.
5. **Registry** — compares `anchor.contractAddress` against a pin **this script holds**
   (`KNOWN_REGISTRIES`, or `--registry`), never against anything from the file, and prints
   only the numeric `chainId` (plus a name from this script's own small lookup table, if it
   has one) — never the file's own `anchor.network`, which a forged file could set to
   anything, including misleading trust language next to a `✓`. No pin available for the
   chain → ⚠, not ✗ (there is nothing to mismatch yet); pin mismatched → ✗, and the on-chain
   calls below are skipped entirely.
6. **On-chain** — calls `AnchorRegistry.verifyRoot` and `.isRevoked` on `anchor.chainId` via
   `anchor.contractAddress`, and confirms a receipt exists for the file's `anchor.txHash`
   containing a matching `RootAnchored` log — this receipt check is what actually confirms
   `txHash` is real; nothing before it does. A revocation is ✗ in a pinned registry and ⚠ at an
   unpinned address (see above). A missing `anchor.txHash` is ⚠ ("no transaction hash
   recorded; root confirmed …"), never ✗ on its own. Also prints the registry's own `anchoredBy`
   address (the issuer key fingerprint is printed earlier, in the headline — not here), and
   builds any explorer link itself from a hardcoded `(chainId → base URL)` map plus that same
   file-supplied `txHash` — it never prints the credential's own `anchor.explorerTxUrl`,
   which a forged file could point anywhere. A `null` chainId (CareerVault's local simulator)
   has no public chain to check, and prints ⚠ instead of attempting one.

Each check prints one line (the file's Revocation line only when it applies): `✓` pass, `✗`
fail, or `⚠` informational (pending, unpinned, a revocation at an unpinned address, no
recorded transaction hash, or nothing independently checkable — none of these fail the run).
The process exits `0` only if nothing printed `✗`, `1` if anything did, and `2` for a usage
error (e.g. a bad `--registry`). A final summary line restates, in one sentence, exactly what
that outcome does and does not prove for this specific credential.

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
  started) gets checked; see below. A run pinned this way says so: "matches **the registry
  you pinned with --registry**", not "CareerVault's pinned registry" — this script has no way
  to independently know an operator-supplied address is actually CareerVault's.
- If a pin exists for the credential's chain and `anchor.contractAddress` does not match it
  (case-insensitive), **Registry** prints ✗ and the on-chain calls are skipped entirely —
  querying a contract already known not to be the pinned one would only produce misleading ✓
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

Every value in this file is stored `\u`-escaped where it would otherwise contain non-ASCII
bytes (not as raw UTF-8) so the file is pure ASCII and unambiguous on any terminal or editor
— this matters most for `keySortingRfc`, where a silently "normalized" combining character or
surrogate pair would invalidate the test.

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

Two other states worth trying:

- A document that has been requested/signed/approved but not yet anchored (before
  `/merkle/run` has run for it) has `anchor: null` in its credential. Integrity and the two
  signatures still print ✓; Merkle and On-chain print ⚠ pending/skipped; the summary says
  "NOT YET ANCHORED" and does not claim Merkle inclusion.
- To see a failure, copy a real credential file, change any `credentialSubject` field, and
  run it again: **Integrity** prints ✗ and the process exits 1.

## Proving the on-chain + registry checks against a real chain

Run against a real local Hardhat node (never a public network):

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

    # then revoke the document as HR (the chain write follows the DB revocation) and rerun
    # the first command on the same credential file:
    # -> ✗ On-chain revocation and a "✗ REVOKED" summary, exit 1; without --registry the
    #    chain is unpinned, so the same flag is ⚠ with a summary starting "REVOKED ON-CHAIN"

Stop the Hardhat node afterwards. Never point any of this at a public network, and never
read, print, or use the real `ANCHOR_PRIVATE_KEY` from `server/.env` or `contracts/.env` —
only the well-known Hardhat test key above.
