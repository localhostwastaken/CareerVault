import { createRequire } from 'node:module';
import { createHash, randomBytes, generateKeyPairSync, sign, verify } from 'node:crypto';
import os from 'node:os';
const req = createRequire('/home/anamay/Programming/college/ly_project/CareerVault/server/package.json');
const canonicalize = (await import('/home/anamay/Programming/college/ly_project/CareerVault/server/node_modules/canonicalize/lib/canonicalize.js')).default;
const { MerkleTree } = req('merkletreejs');
const sha = (b) => createHash('sha256').update(b).digest();
const t = (f, n) => { const s = process.hrtime.bigint(); for (let i = 0; i < n; i++) f(i); return Number(process.hrtime.bigint() - s) / 1e6 / n; };
const subj = { schemaVersion: 'exp-letter/1', employeeName: 'Priya Sharma', designation: 'Senior Engineer', department: 'Platform', dateOfJoining: '2019-04-01', lastWorkingDay: '2025-03-31', employmentType: 'FULL_TIME', conductSummary: 'x'.repeat(300), issueDate: '2025-04-02', referenceNumber: 'ACME/EXP/2025/AB12CD' };
const salt = randomBytes(32).toString('hex');
const hashDoc = () => createHash('sha256').update(canonicalize(subj) + salt, 'utf8').digest('hex');
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const h = hashDoc();
const stmt = () => createHash('sha256').update(canonicalize({ v: 1, documentHash: h, role: 'MANAGER', memberId: '00000000-0000-0000-0000-000000000000' })).digest();
const st = stmt(); const sg = sign('sha256', st, privateKey);
console.log(JSON.stringify({ cpu: os.cpus()[0].model, cores: os.cpus().length, node: process.version }));
console.log('JCS+salt+SHA256 (ms/op):', t(hashDoc, 20000).toFixed(4));
console.log('statement hash (ms/op):', t(stmt, 20000).toFixed(4));
console.log('RS256 sign (ms/op):', t(() => sign('sha256', st, privateKey), 300).toFixed(3));
console.log('RS256 verify (ms/op):', t(() => verify('sha256', st, publicKey, sg), 3000).toFixed(4));
for (const n of [10, 100, 1000, 10000, 100000]) {
  const leaves = Array.from({ length: n }, () => randomBytes(32));
  let tree; const build = t(() => { tree = new MerkleTree(leaves, sha, { sortPairs: true }); }, n >= 10000 ? 3 : 20);
  const root = tree.getRoot();
  const idx = Math.floor(n / 3); const proof = tree.getProof(leaves[idx]);
  const ver = t(() => MerkleTree.verify(proof, leaves[idx], root, sha, { sortPairs: true }), 5000);
  const ok = MerkleTree.verify(proof, leaves[idx], root, sha, { sortPairs: true });
  console.log(`n=${n}: build ${build.toFixed(2)} ms, proof len ${proof.length} hashes (${proof.length*32} B), verify ${ver.toFixed(4)} ms, ok=${ok}`);
}
