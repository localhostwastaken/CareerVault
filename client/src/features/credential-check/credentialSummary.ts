import type { PinStatus } from './registryPinStatus.ts'
import type { CheckKind, Credential } from './types.ts'

// One sentence stating exactly what this run proved, or that it failed — the port of the
// CLI's printSummary. Driven by pinStatus/revoked rather than the lines' wording, so a
// reworded detail can never change what a pass claims.

interface SummaryInput {
  failed: boolean
  pinStatus: PinStatus
  // isRevoked()'s answer, or null when the chain was never asked.
  revoked: boolean | null
  checkChain: boolean
}

export function credentialSummary(
  cred: Credential,
  { failed, pinStatus, revoked, checkChain }: SummaryInput,
): { kind: CheckKind; text: string } {
  if (cred.revocation !== null || (revoked && pinStatus === 'matched')) {
    const why =
      cred.revocation !== null
        ? 'the credential itself states it was revoked.'
        : 'the pinned AnchorRegistry records this document as revoked, and nothing can clear that flag.'
    return { kind: 'fail', text: `REVOKED — ${why} Do not accept it.` }
  }
  if (failed) return { kind: 'fail', text: 'Verification FAILED — see the failed check(s) below.' }

  const caveat =
    'It does NOT prove issuer.publicKeyPem belongs to the named organization — get the ' +
    'issuer key fingerprint from the organization out of band, or look up ' +
    "proof.documentHash on CareerVault's public verify page " +
    `(/verify/hash/${cred.proof.documentHash}) and confirm it names the same organization ` +
    'and verdict.'
  const signatures = 'both role-bound signatures verify under the embedded issuer key'

  if (pinStatus === 'pending') {
    return {
      kind: 'warn',
      text:
        `A pass proves: content integrity and ${signatures}. This document is NOT YET ANCHORED — ` +
        `there is no Merkle proof and no on-chain evidence to check at all yet. ${caveat}`,
    }
  }
  // Offline mode has no CLI equivalent: without the chain reads, a pass must not claim
  // anything the registry would have had to confirm.
  if (!checkChain && pinStatus !== 'na') {
    return {
      kind: 'warn',
      text:
        `A pass proves: content integrity, ${signatures}, and Merkle inclusion. The on-chain check ` +
        'was skipped (offline mode), so nothing confirms the Merkle root exists in any registry or ' +
        `that the registry records no revocation. ${caveat}`,
    }
  }
  // Only reachable for an unpinned registry: a pinned one's revocation failed the run above.
  const revokedLead = revoked
    ? 'REVOKED ON-CHAIN at the address the file names, which is not confirmed to be ' +
      "CareerVault's registry: treat this document as revoked unless the issuer says otherwise. "
    : ''
  const anchoredClaim =
    pinStatus === 'matched'
      ? "that its Merkle root exists in CareerVault's pinned AnchorRegistry, which records no revocation of it"
      : pinStatus === 'unpinned'
        ? "that its Merkle root exists on-chain at the address the file names (NOT confirmed to be CareerVault's registry — unpinned for this chain, see the Registry line)"
        : 'nothing about anchoring — this document is NOT independently anchored (no public chain to check)'
  return {
    kind: revoked ? 'warn' : 'pass',
    text: `${revokedLead}A pass proves: content integrity, ${signatures}, Merkle inclusion, and ${anchoredClaim}. ${caveat}`,
  }
}
