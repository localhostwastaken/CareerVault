import { checkOnChain } from './chainChecks.ts'
import { keyFingerprint } from './credentialCrypto.ts'
import { credentialSummary } from './credentialSummary.ts'
import { explorerAddressUrl, explorerTxUrl } from './explorerLinks.ts'
import { checkIntegrity, checkMerkle, checkRevocationNotice, checkSignature } from './localChecks.ts'
import { registryPinStatus } from './registryPinStatus.ts'
import type { CheckLine, Credential, CredentialReport, ReportAnchor } from './types.ts'

// Browser port of tools/verify-credential/verify-credential.mjs: the same checks, in the same
// order, with the same verdicts, run in the visitor's own browser from the downloaded file
// alone. It calls no CareerVault API, so it keeps working if CareerVault is down or gone — the
// only network traffic is to public Polygon Amoy RPC endpoints, and only when checkChain is on.
//
// What a pass PROVES: the credentialSubject bytes are exactly what was hashed (Integrity); both
// role-bound signatures verify under the embedded issuer key; the hash is included in the
// anchored Merkle tree, once the document has been anchored; and, with the chain check on and
// the registry pinned, that the root exists in CareerVault's OWN AnchorRegistry (not merely a
// contract the file names) and that the registry records no revocation.
//
// What it does NOT prove: that issuer.publicKeyPem belongs to the named organization. Anyone
// can build a credential with their own key and any issuer.name, and every check still passes.
// Closing that needs an out-of-band step — the key fingerprint from the organization itself,
// or the hash looked up on CareerVault's public verify page. summary.text says so every time.
//
// It never throws for a bad credential: a malformed key, hash or RPC failure is a failed line.

function reportAnchor({ anchor }: Credential): ReportAnchor | null {
  if (!anchor) return null
  const { chainId, contractAddress, txHash, merkleRoot } = anchor
  return {
    chainId,
    contractAddress,
    txHash,
    merkleRoot,
    explorerTxUrl: explorerTxUrl(chainId, txHash),
    explorerContractUrl: explorerAddressUrl(chainId, contractAddress),
  }
}

export async function verifyCredential(
  credential: Credential,
  { checkChain }: { checkChain: boolean },
): Promise<CredentialReport> {
  const pem = credential.issuer.publicKeyPem
  // A malformed PEM only loses the fingerprint here; the signature checks report it as a fail.
  const fingerprint = pem ? await keyFingerprint(pem).catch(() => null) : null

  const lines: CheckLine[] = [
    await checkIntegrity(credential),
    await checkSignature(credential, 'MANAGER'),
    await checkSignature(credential, 'HR'),
  ]
  const revocation = checkRevocationNotice(credential)
  if (revocation) lines.push(revocation)
  lines.push(await checkMerkle(credential))
  const chain = await checkOnChain(credential, checkChain)
  lines.push(...chain.lines)

  const failed = lines.some((line) => line.kind === 'fail')
  const pinStatus = registryPinStatus(credential.anchor)
  return {
    documentType: credential.documentType,
    credentialId: credential.id,
    issuerName: credential.issuer.name,
    issuerDomain: credential.issuer.domain,
    keyFingerprint: fingerprint,
    documentHash: credential.proof.documentHash,
    lines,
    summary: credentialSummary(credential, { failed, pinStatus, revoked: chain.revoked, checkChain }),
    failed,
    anchor: reportAnchor(credential),
    rpcUsed: chain.rpcUsed,
  }
}
