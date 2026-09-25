#!/usr/bin/env node
// CareerVault offline credential verifier.
//
// A downloaded credential (`GET /api/v1/documents/:id/credential`) packages the salt, both
// signatures, the issuer's public key, and a Merkle proof, so it can be checked without
// calling CareerVault's API. This script is an independent re-implementation of that check
// — it imports NOTHING from `server/`, so a third party (an examiner, an employer) could
// have written it from the credential alone.
//
// What exit 0 PROVES: the credentialSubject bytes are exactly what was hashed (Integrity);
// both role-bound signatures verify under the embedded issuer key (the two signature
// checks); that hash is included in the anchored Merkle tree (Merkle) — only once the
// document has actually been anchored, see the final summary for the pending case; and,
// only when the registry is pinned (built-in or --registry), that the Merkle root exists in
// CareerVault's OWN AnchorRegistry, not just some contract the file names — see
// `KNOWN_REGISTRIES` below — and that the registry does not record the document as revoked.
// A revoked credential exits 1: whether the file itself says so, or the pinned registry
// does. Only CareerVault's wallet can write that registry's flag and nothing can clear it,
// so it is conclusive. A revocation found at an unpinned address only warns, prominently.
//
// What it does NOT prove: that `issuer.publicKeyPem` belongs to the named organization.
// Nothing in the file, or on chain, binds a key to a legal identity — anyone can build a
// credential with their own key and any `issuer.name` they like, and every check above will
// still pass. Closing that gap needs an OUT-OF-BAND step: get the issuer key fingerprint
// from the organization directly, or look up `proof.documentHash` on CareerVault's public
// verify page (`/verify/hash/<documentHash>`) and confirm it names the same organization
// and verdict. The final summary line restates exactly this, for this run's actual outcome,
// every time.
//
// Usage:
//   node verify-credential.mjs <credential.json> [--rpc <url>] [--registry <address>] [--explain]
//   node verify-credential.mjs --selftest
import { readFileSync } from 'node:fs';
import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import canonicalize from 'canonicalize';
import { Contract, isAddress, JsonRpcProvider } from 'ethers';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---- Step 0: shared primitives (independent re-implementation of crypto.util.ts / merkle.util.ts) ----

const sha256Hex = (data) => createHash('sha256').update(data).digest('hex');

function canonicalizeJson(value) {
  const json = canonicalize(value);
  if (json === undefined) throw new Error('value is not JCS-canonicalizable');
  return json;
}

const hashDocument = (contentJson, salt) =>
  sha256Hex(canonicalizeJson(contentJson) + salt);

const signingStatementHash = (documentHash, role, memberId) =>
  sha256Hex(canonicalizeJson({ v: 1, documentHash, role, memberId }));

// RS256 signs the 32 RAW digest bytes of the hex statement (crypto.sign('sha256', bytes, key)
// hashes `bytes` again before the RSA step) — so verification re-hashes them too.
const verifyStatement = (publicKeyPem, statementHex, signatureB64) =>
  cryptoVerify(
    'sha256',
    Buffer.from(statementHex, 'hex'),
    publicKeyPem,
    Buffer.from(signatureB64, 'base64'),
  );

// SHA-256 of the key's SPKI DER encoding — a stable fingerprint to compare, out of band,
// against what the organization itself says the key is (or cross-checked via
// proof.documentHash on CareerVault's public verify page). Nothing in-band can confirm
// this binding; see the header comment. Callers must catch: a malformed PEM throws here.
const keyFingerprint = (publicKeyPem) =>
  sha256Hex(createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' }));

// Fold a Merkle proof up to a root: sha256(min(a,b) || max(a,b)), pairs sorted BYTEWISE
// (position is not trusted). Leaves are not re-hashed, so folding starts from the raw leaf
// bytes; zero steps means the leaf IS the root (single-leaf tree).
function merkleRootFromProof(leafHashHex, proofPath) {
  let acc = Buffer.from(leafHashHex, 'hex');
  for (const step of proofPath) {
    const sib = Buffer.from(step.hash, 'hex');
    const [a, b] = Buffer.compare(acc, sib) <= 0 ? [acc, sib] : [sib, acc];
    acc = createHash('sha256').update(Buffer.concat([a, b])).digest();
  }
  return acc.toString('hex');
}

// Copied from server/src/services/blockchain/anchor-registry.abi.ts (not imported — the
// verifier must not depend on server/). Only the read-only surface this script calls.
const ANCHOR_REGISTRY_ABI = [
  'function verifyRoot(bytes32 rootHash) view returns (bool exists, tuple(bytes32 rootHash, uint256 documentCount, uint256 anchoredAt, address anchoredBy, bool exists) record)',
  'function isRevoked(bytes32 documentHash) view returns (bool revoked, uint256 revokedAt)',
  'event RootAnchored(bytes32 indexed rootHash, uint256 documentCount, uint256 anchoredAt, address indexed anchoredBy)',
];
const DEFAULT_RPC = { 80002: 'https://rpc-amoy.polygon.technology' };
const EXPLORER_BASE = { 80002: 'https://amoy.polygonscan.com' };
// Only for display (Registry / On-chain root ✓ lines) — NEVER the file's own anchor.network,
// which is untrusted text and could carry a misleading trust claim in plain sight of a ✓.
const KNOWN_NETWORK_NAMES = { 80002: 'polygon-amoy', 31337: 'hardhat-local' };
const networkLabel = (chainId) => KNOWN_NETWORK_NAMES[chainId] ?? `chain ${chainId}`;

// CareerVault's OFFICIAL AnchorRegistry deployments, pinned HERE rather than trusted from
// the credential file. WHY this is the fix for forgeability: only CareerVault's authorized
// anchor wallet can write to ITS OWN registry, so pinning the address is what actually rules
// out a forger who deploys a look-alike AnchorRegistry and points anchor.contractAddress at
// it — verifyRoot() on ANY contract truthfully answers "yes" for whatever that contract was
// itself told to anchor. `--registry <address>` pins/overrides this for any chain (e.g. a
// local Hardhat deployment, which has no fixed address to hardcode here).
const KNOWN_REGISTRIES = {
  // Filled in once CareerVault's Amoy AnchorRegistry is deployed. `null` means "not deployed
  // yet", which prints as unpinned (⚠), not mismatched (✗) — there is nothing to mismatch.
  80002: null,
};

// Pure (no I/O): the pin a credential's anchor should be checked against, and whether it
// matches. 'pending' means no anchor exists at all yet (nothing to check); 'na' means a
// chain that cannot be checked independently (the local simulator, or malformed data).
// Shared by checkOnChain (to decide what to print/fail) and the final summary.
function registryPinStatus(anchor, registryOverride) {
  if (!anchor) return 'pending';
  if (anchor.chainId === null || !anchor.contractAddress) return 'na';
  const pin = registryOverride ?? KNOWN_REGISTRIES[anchor.chainId] ?? null;
  if (!pin) return 'unpinned';
  return pin.toLowerCase() === anchor.contractAddress.toLowerCase()
    ? 'matched'
    : 'mismatched';
}

// ---- Reporting: every check prints exactly one ✓ / ✗ / ⚠ line + detail ----

const ICON = { pass: '✓', fail: '✗', warn: '⚠' };
// Counted here rather than read back from the check functions' return values, so a ✗ printed
// mid-way through a check that goes on to print a ✓ still fails the run.
const tally = { fail: 0 };
function report(kind, label, detail) {
  if (kind === 'fail') tally.fail++;
  console.log(`${ICON[kind]} ${label} — ${detail}`);
  return kind;
}
const isoOrNull = (value) => {
  const date = new Date(value ?? NaN);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const say = (explain, ...lines) => {
  if (explain) for (const l of lines) console.log(`    ${l}`);
};

// 1. Integrity: canonicalize(credentialSubject) + salt, hashed, must equal proof.documentHash.
function checkIntegrity(cred, explain) {
  const { credentialSubject, proof } = cred;
  const canon = canonicalizeJson(credentialSubject);
  const computed = sha256Hex(canon + proof.salt);
  say(explain, `JCS(credentialSubject) = ${canon}`, `+ salt = ${proof.salt}`, `sha256 hex = ${computed}`);
  return computed === proof.documentHash
    ? report('pass', 'Integrity', `documentHash matches (${computed})`)
    : report('fail', 'Integrity', `computed ${computed}, credential says ${proof.documentHash}`);
}

// 2/3. Co-signatures: each role signs a statement binding the hash to their role + member id.
// Both signatures verify under the SAME embedded issuer key (one org key, not one key per
// signer) — the statement's role/memberId, not the key, is what makes the two distinct.
function checkSignature(cred, label, role, memberId, signatureB64, explain) {
  const { proof, issuer } = cred;
  if (!memberId || !signatureB64) return report('fail', label, 'missing member id or signature');
  if (!issuer.publicKeyPem) return report('fail', label, 'issuer.publicKeyPem missing');
  const statement = signingStatementHash(proof.documentHash, role, memberId);
  say(explain, `statement = sha256hex(JCS({v:1, documentHash, role:'${role}', memberId:'${memberId}'}))`, `= ${statement}`);
  try {
    return verifyStatement(issuer.publicKeyPem, statement, signatureB64)
      ? report('pass', label, 'RS256 signature valid')
      : report('fail', label, 'RS256 signature does not verify');
  } catch (err) {
    return report('fail', label, `verification error: ${err.message}`);
  }
}

// The file's own revocation block (the server fills it once the document is REVOKED, which is
// terminal). A credential that says it was revoked must never pass; one that says nothing
// proves nothing either way, so that prints no line.
function checkRevocationNotice(cred) {
  if (cred.revocation == null) return null;
  const at = isoOrNull(cred.revocation.revokedAt);
  return report('fail', 'Revocation', `the credential states it was revoked${at ? ` on ${at}` : ''}`);
}

// 4. Merkle: the documentHash must fold, through the anchored proof path, to anchor.merkleRoot.
function checkMerkle(cred, explain) {
  const { proof, anchor } = cred;
  if (!anchor) return report('warn', 'Merkle', 'pending — document not yet anchored');
  const path = anchor.proofPath ?? [];
  const root = merkleRootFromProof(proof.documentHash, path);
  say(explain, `leaf = documentHash = ${proof.documentHash}`, `${path.length} proof step(s)`, `folded root = ${root}`);
  return root === anchor.merkleRoot
    ? report('pass', 'Merkle', `reconciles to anchored root (${root})`)
    : report('fail', 'Merkle', `computed ${root}, anchor says ${anchor.merkleRoot}`);
}

// 5/6. Registry, then On-chain: Registry compares anchor.contractAddress against a pin THIS
// SCRIPT holds (KNOWN_REGISTRIES / --registry), never the file — see that constant's comment
// for why. On-chain then confirms the root, prints who anchored it, and confirms the receipt.
// `chainInfo` is an out-param: {revoked} is filled in if/when isRevoked() answers, so the
// final summary (the only place that needs it) doesn't have to re-run the RPC call.
async function checkOnChain(cred, { rpc, registry }, explain, chainInfo) {
  const { proof, anchor } = cred;
  if (!anchor) return report('warn', 'On-chain', 'skipped — no anchor to check');
  if (anchor.chainId === null)
    return report('warn', 'On-chain', 'anchored on the local simulator — no public chain to check');
  if (!anchor.contractAddress) return report('fail', 'On-chain', 'anchor.contractAddress missing');

  const pinStatus = registryPinStatus(anchor, registry);
  const registryName = registry ? 'the registry you pinned with --registry' : "CareerVault's registry";
  if (pinStatus === 'mismatched') {
    const pin = registry ?? KNOWN_REGISTRIES[anchor.chainId];
    return report('fail', 'Registry', `${anchor.contractAddress} is not ${registryName} (pinned: ${pin})`);
  }
  report(
    pinStatus === 'matched' ? 'pass' : 'warn',
    'Registry',
    pinStatus === 'matched'
      ? `${anchor.contractAddress} matches ${registryName} for ${networkLabel(anchor.chainId)}`
      : `not pinned for chain ${anchor.chainId} — pass --registry <address> to check`,
  );

  const rpcUrl = rpc ?? DEFAULT_RPC[anchor.chainId];
  if (!rpcUrl) return report('fail', 'On-chain', `no default RPC for chainId ${anchor.chainId}; pass --rpc`);

  let provider;
  try {
    provider = new JsonRpcProvider(rpcUrl, anchor.chainId, { staticNetwork: true });
    const contract = new Contract(anchor.contractAddress, ANCHOR_REGISTRY_ABI, provider);
    const rootBytes32 = `0x${anchor.merkleRoot}`;

    const [exists, record] = await contract.verifyRoot(rootBytes32);
    say(explain, `verifyRoot(${rootBytes32}) -> exists=${exists}`);
    if (!exists) return report('fail', 'On-chain root', 'root not found on-chain');
    const anchoredAt = new Date(Number(record.anchoredAt) * 1000).toISOString();
    // Built from a hardcoded (chainId -> explorer) map + the FILE's anchor.txHash — only the
    // LATER receipt check confirms that hash is real. Never anchor.explorerTxUrl: a forged
    // file could point that anywhere.
    const link = EXPLORER_BASE[anchor.chainId] && anchor.txHash
      ? `${EXPLORER_BASE[anchor.chainId]}/tx/${anchor.txHash}`
      : null;
    report(
      'pass',
      'On-chain root',
      `exists on ${networkLabel(anchor.chainId)}, anchored ${anchoredAt}, anchored by ${record.anchoredBy}` +
        (link ? ` (${link})` : ''),
    );

    const [revoked, revokedAt] = await contract.isRevoked(`0x${proof.documentHash}`);
    chainInfo.revoked = revoked;
    const pinned = pinStatus === 'matched';
    const revokedOn = new Date(Number(revokedAt) * 1000).toISOString();
    if (!revoked) report('pass', 'On-chain revocation', 'not revoked');
    else if (pinned) report('fail', 'On-chain revocation', `REVOKED on ${revokedOn} in ${registryName}`);
    else report('warn', 'On-chain revocation', `REVOKED on ${revokedOn} at an unpinned address — treat it as revoked`);

    // A batch retry after a restart can record the anchor without its transaction. The root
    // itself was just confirmed above, so the missing hash alone is no reason to fail.
    if (!anchor.txHash) {
      const where = pinned ? `in ${registryName}` : 'at the address the file names (unpinned)';
      return report('warn', 'On-chain receipt', `no transaction hash recorded; root confirmed ${where}`);
    }
    const receipt = await provider.getTransactionReceipt(anchor.txHash);
    const iface = contract.interface;
    const found = (receipt?.logs ?? []).some((log) => {
      if (log.address.toLowerCase() !== anchor.contractAddress.toLowerCase()) return false;
      try {
        const parsed = iface.parseLog(log);
        return parsed?.name === 'RootAnchored' && parsed.args.rootHash.toLowerCase() === rootBytes32.toLowerCase();
      } catch {
        return false;
      }
    });
    return found
      ? report('pass', 'On-chain receipt', `tx ${anchor.txHash} contains RootAnchored for this root`)
      : report('fail', 'On-chain receipt', `no RootAnchored log for this root in tx ${anchor.txHash}`);
  } catch (err) {
    return report('fail', 'On-chain', `RPC error: ${err.shortMessage ?? err.message}`);
  }
}

// One sentence stating exactly what this run proved (or that it failed) — restates the
// header comment's "what exit 0 proves" for THIS credential's actual outcome. Driven by
// `pinStatus`/`revoked` (not the check functions' pass/fail strings) since those are pure
// and need no re-run.
function printSummary(cred, exitCode, pinStatus, pinSource, revoked) {
  if (cred.revocation != null || (revoked && pinStatus === 'matched')) {
    console.log(
      '\n✗ REVOKED — ' +
        (cred.revocation != null
          ? 'the credential itself states it was revoked.'
          : 'the pinned AnchorRegistry records this document as revoked, and nothing can clear that flag.') +
        ' Do not accept it.',
    );
    return;
  }
  if (exitCode !== 0) {
    console.log('\n✗ Verification FAILED — see the ✗ line(s) above.');
    return;
  }
  const caveat =
    'It does NOT prove issuer.publicKeyPem belongs to the named organization — get the ' +
    'issuer key fingerprint from the organization out of band, or look up ' +
    "proof.documentHash on CareerVault's public verify page " +
    `(/verify/hash/${cred.proof?.documentHash}) and confirm it names the same organization ` +
    'and verdict.';
  // Only reachable for an unpinned registry: a pinned one's revocation failed the run above.
  const revokedLead = revoked
    ? 'REVOKED ON-CHAIN at the address the file names, which is not confirmed to be ' +
      "CareerVault's registry: treat this document as revoked unless the issuer says otherwise. "
    : '';

  if (pinStatus === 'pending') {
    console.log(
      `\n⚠ Exit 0 proves: content integrity and both role-bound signatures verify under the ` +
        `embedded issuer key. This document is NOT YET ANCHORED — there is no Merkle proof ` +
        `and no on-chain evidence to check at all yet. ${caveat}`,
    );
    return;
  }
  const registryName =
    pinSource === 'override' ? 'the registry you pinned with --registry' : "CareerVault's pinned AnchorRegistry";
  const anchoredClaim =
    pinStatus === 'matched'
      ? `that its Merkle root exists in ${registryName}, which records no revocation of it`
      : pinStatus === 'unpinned'
        ? 'that its Merkle root exists on-chain at the address the file names (NOT confirmed to be CareerVault\'s registry — unpinned for this chain, see the Registry line)'
        : 'nothing about anchoring — this document is NOT independently anchored (no public chain to check)';
  const icon = revoked ? '⚠' : '✓';
  console.log(
    `\n${icon} ${revokedLead}Exit 0 proves: content integrity, both role-bound signatures verify ` +
      `under the embedded issuer key, Merkle inclusion, and ${anchoredClaim}. ${caveat}`,
  );
}

async function verifyCredential(cred, { rpc, registry, explain }) {
  const { issuer, anchor } = cred;
  console.log(`Verifying ${cred.documentType} ${cred.id}`);
  console.log(`Claims issuer: ${issuer?.name}`);
  if (issuer?.publicKeyPem) {
    try {
      console.log(`  issuer key fingerprint (SHA-256 of SPKI DER): ${keyFingerprint(issuer.publicKeyPem)}`);
    } catch (err) {
      // Don't crash: the signature checks below independently re-derive a key from this
      // same PEM and will report a clean ✗ for it (see checkSignature's own try/catch).
      console.log(`  issuer key fingerprint unavailable — issuer.publicKeyPem is malformed: ${err.message}`);
    }
  }
  console.log();

  const chainInfo = { revoked: null };
  tally.fail = 0;
  checkIntegrity(cred, explain);
  checkSignature(cred, 'Manager signature', 'MANAGER', cred.proof.signerMemberId, cred.proof.managerSignature, explain);
  checkSignature(cred, 'HR signature', 'HR', cred.proof.approverMemberId, cred.proof.hrSignature, explain);
  checkRevocationNotice(cred);
  checkMerkle(cred, explain);
  await checkOnChain(cred, { rpc, registry }, explain, chainInfo);
  const exitCode = tally.fail > 0 ? 1 : 0;
  const pinSource = registry ? 'override' : 'builtin';
  printSummary(cred, exitCode, registryPinStatus(anchor, registry), pinSource, chainInfo.revoked);
  return exitCode;
}

// ---- --selftest: recompute every tools/verify-credential/test-vectors.json entry independently ----
function selftest() {
  const vectors = JSON.parse(readFileSync(join(HERE, 'test-vectors.json'), 'utf8'));
  let failures = 0;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    if (!ok) failures++;
    report(ok ? 'pass' : 'fail', label, ok ? String(actual) : `got ${actual}, expected ${expected}`);
  };

  for (const { literal, expected } of vectors.rfc8785.numbers)
    check(`RFC 8785 number ${literal}`, canonicalizeJson(Number(literal)), expected);
  check(
    'RFC 8785 §3.2.3 key sorting (UTF-16 code unit order)',
    canonicalizeJson(vectors.rfc8785.keySortingRfc.input),
    vectors.rfc8785.keySortingRfc.expected,
  );
  check(
    'key sorting (canonicalize README example, ASCII-only)',
    canonicalizeJson(vectors.rfc8785.keySortingReadmeExample.input),
    vectors.rfc8785.keySortingReadmeExample.expected,
  );

  for (const [i, c] of vectors.pipeline.documentHash.entries())
    check(`documentHash[${i}]`, hashDocument(c.content, c.salt), c.expected);
  for (const c of vectors.pipeline.statementHash)
    check(`statementHash ${c.role}`, signingStatementHash(c.documentHash, c.role, c.memberId), c.expected);
  for (const m of vectors.pipeline.merkle)
    check(`merkle root (${m.label})`, merkleRootFromProof(m.proof.leaf, m.proof.path), m.root);
  return failures === 0 ? 0 : 1;
}

// ---- CLI ----
function parseArgs(argv) {
  const out = {
    selftest: false,
    explain: false,
    rpc: null,
    registry: null,
    file: null,
    usageError: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--selftest') out.selftest = true;
    else if (a === '--explain') out.explain = true;
    else if (a === '--rpc') out.rpc = argv[++i];
    else if (a === '--registry') {
      const value = argv[++i];
      // A missing/empty/invalid value is a usage error, not "no override": silently
      // falling back to the built-in pin (or to unpinned) here would let a bad wrapper
      // script quietly defeat the one check that makes a forged contractAddress detectable.
      if (!value || !isAddress(value)) {
        out.usageError = `--registry requires a valid 0x address, got ${JSON.stringify(value ?? null)}`;
      } else {
        out.registry = value;
      }
    } else if (!out.file) out.file = a;
  }
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.usageError) {
    console.error(`Usage error: ${opts.usageError}`);
    return 2;
  }
  if (opts.selftest) return selftest();
  if (!opts.file) {
    console.error('Usage: node verify-credential.mjs <credential.json> [--rpc <url>] [--registry <address>] [--explain]');
    console.error('       node verify-credential.mjs --selftest');
    return 1;
  }
  const cred = JSON.parse(readFileSync(opts.file, 'utf8'));
  return verifyCredential(cred, opts);
}

process.exit(await main());
