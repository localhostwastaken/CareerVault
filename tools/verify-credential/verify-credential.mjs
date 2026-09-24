#!/usr/bin/env node
// CareerVault offline credential verifier.
//
// A downloaded credential (`GET /api/v1/documents/:id/credential`) claims to be verifiable
// without trusting CareerVault's server: the salt, both signatures, the issuer's public key
// and the Merkle proof travel inside the file itself. This script is that claim made
// executable — an independent re-implementation of the five checks described in the
// credential's own `schemes` + `verificationInstructions` fields. It imports NOTHING from
// server/ on purpose: a third party (an examiner, an employer) would write exactly this.
//
// Usage:
//   node verify-credential.mjs <credential.json> [--rpc <url>] [--explain]
//   node verify-credential.mjs --selftest
import { readFileSync } from 'node:fs';
import { createHash, verify as cryptoVerify } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import canonicalize from 'canonicalize';
import { Contract, JsonRpcProvider } from 'ethers';

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

// ---- Reporting: every check prints exactly one ✓ / ✗ / ⚠ line + detail ----

const ICON = { pass: '✓', fail: '✗', warn: '⚠' };
function report(kind, label, detail) {
  console.log(`${ICON[kind]} ${label} — ${detail}`);
  return kind;
}
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

// 5. On-chain: the anchored root (and this document's revocation flag) as the contract itself
// reports them — the one check that does not just trust bytes inside the credential file.
async function checkOnChain(cred, rpcOverride, explain) {
  const { proof, anchor } = cred;
  if (!anchor) return report('warn', 'On-chain', 'skipped — no anchor to check');
  if (anchor.chainId === null)
    return report('warn', 'On-chain', 'anchored on the local simulator — no public chain to check');
  if (!anchor.contractAddress) return report('fail', 'On-chain', 'anchor.contractAddress missing');

  const rpcUrl = rpcOverride ?? DEFAULT_RPC[anchor.chainId];
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
    report('pass', 'On-chain root', `exists on ${anchor.network}, anchored ${anchoredAt}${anchor.explorerTxUrl ? ` (${anchor.explorerTxUrl})` : ''}`);

    const [revoked, revokedAt] = await contract.isRevoked(`0x${proof.documentHash}`);
    report(
      revoked ? 'warn' : 'pass',
      'On-chain revocation',
      revoked ? `REVOKED at ${new Date(Number(revokedAt) * 1000).toISOString()}` : 'not revoked',
    );

    if (!anchor.txHash) return report('fail', 'On-chain receipt', 'anchor.txHash missing');
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

async function verifyCredential(cred, { rpc, explain }) {
  console.log(`Verifying ${cred.documentType} ${cred.id} issued by ${cred.issuer?.name}\n`);
  const results = [
    checkIntegrity(cred, explain),
    checkSignature(cred, 'Manager signature', 'MANAGER', cred.proof.signerMemberId, cred.proof.managerSignature, explain),
    checkSignature(cred, 'HR signature', 'HR', cred.proof.approverMemberId, cred.proof.hrSignature, explain),
    checkMerkle(cred, explain),
    await checkOnChain(cred, rpc, explain),
  ];
  return results.includes('fail') ? 1 : 0;
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
  check('RFC 8785 key sorting', canonicalizeJson(vectors.rfc8785.keySorting.input), vectors.rfc8785.keySorting.expected);

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
  const out = { selftest: false, explain: false, rpc: null, file: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--selftest') out.selftest = true;
    else if (a === '--explain') out.explain = true;
    else if (a === '--rpc') out.rpc = argv[++i];
    else if (!out.file) out.file = a;
  }
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.selftest) return selftest();
  if (!opts.file) {
    console.error('Usage: node verify-credential.mjs <credential.json> [--rpc <url>] [--explain]');
    console.error('       node verify-credential.mjs --selftest');
    return 1;
  }
  const cred = JSON.parse(readFileSync(opts.file, 'utf8'));
  return verifyCredential(cred, opts);
}

process.exit(await main());
