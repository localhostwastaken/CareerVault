import { checkLine } from './checkLine.ts'
import {
  canonicalizeJson,
  merkleRootFromProof,
  sha256Hex,
  signingStatementHash,
  verifyStatement,
} from './credentialCrypto.ts'
import type { CheckLine, Credential } from './types.ts'

// The checks that need nothing but the file — ports of checkIntegrity, checkSignature,
// checkRevocationNotice and checkMerkle in tools/verify-credential, same labels and verdicts.

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err))

export async function checkIntegrity({ credentialSubject, proof }: Credential): Promise<CheckLine> {
  try {
    const canon = canonicalizeJson(credentialSubject)
    const computed = await sha256Hex(canon + proof.salt)
    const explain = [`JCS(credentialSubject) = ${canon}`, `+ salt = ${proof.salt}`, `sha256 hex = ${computed}`]
    return computed === proof.documentHash
      ? checkLine('integrity', 'Integrity', 'pass', `documentHash matches (${computed})`, explain)
      : checkLine(
          'integrity',
          'Integrity',
          'fail',
          `computed ${computed}, credential says ${proof.documentHash}`,
          explain,
        )
  } catch (err) {
    return checkLine('integrity', 'Integrity', 'fail', `could not hash credentialSubject: ${errorMessage(err)}`)
  }
}

// Both roles verify under the SAME embedded issuer key (one org key, not one per signer):
// the statement's role + memberId, not the key, is what makes the two signatures distinct.
export async function checkSignature(cred: Credential, role: 'MANAGER' | 'HR'): Promise<CheckLine> {
  const isManager = role === 'MANAGER'
  const key = isManager ? 'manager-signature' : 'hr-signature'
  const label = isManager ? 'Manager signature' : 'HR signature'
  const memberId = isManager ? cred.proof.signerMemberId : cred.proof.approverMemberId
  const signature = isManager ? cred.proof.managerSignature : cred.proof.hrSignature
  const pem = cred.issuer.publicKeyPem
  if (!memberId || !signature) return checkLine(key, label, 'fail', 'missing member id or signature')
  if (!pem) return checkLine(key, label, 'fail', 'issuer.publicKeyPem missing')

  const statement = await signingStatementHash(cred.proof.documentHash, role, memberId)
  const explain = [
    `statement = sha256hex(JCS({v:1, documentHash, role:'${role}', memberId:'${memberId}'}))`,
    `= ${statement}`,
  ]
  try {
    return (await verifyStatement(pem, statement, signature))
      ? checkLine(key, label, 'pass', 'RS256 signature valid', explain)
      : checkLine(key, label, 'fail', 'RS256 signature does not verify', explain)
  } catch (err) {
    return checkLine(key, label, 'fail', `verification error: ${errorMessage(err)}`, explain)
  }
}

// A credential that says it was revoked must never pass; one that says nothing proves
// nothing either way, so that case yields no line at all.
export function checkRevocationNotice({ revocation }: Credential): CheckLine | null {
  if (revocation === null) return null
  const date = new Date(revocation.revokedAt ?? NaN)
  const on = Number.isNaN(date.getTime()) ? '' : ` on ${date.toISOString()}`
  return checkLine('revocation', 'Revocation', 'fail', `the credential states it was revoked${on}`)
}

export async function checkMerkle({ proof, anchor }: Credential): Promise<CheckLine> {
  if (!anchor) return checkLine('merkle', 'Merkle', 'warn', 'pending — document not yet anchored')
  const root = await merkleRootFromProof(proof.documentHash, anchor.proofPath)
  const explain = [
    `leaf = documentHash = ${proof.documentHash}`,
    `${anchor.proofPath.length} proof step(s)`,
    `folded root = ${root}`,
  ]
  return root === anchor.merkleRoot
    ? checkLine('merkle', 'Merkle', 'pass', `reconciles to anchored root (${root})`, explain)
    : checkLine('merkle', 'Merkle', 'fail', `computed ${root}, anchor says ${anchor.merkleRoot}`, explain)
}
