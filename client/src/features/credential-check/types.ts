// The narrowed slice of a downloaded credential (server/src/modules/document/credential.builder.ts)
// that the checks actually read. Everything else in the file is display text the checks
// never trust, so it is deliberately not modelled here.

export interface ProofStep {
  hash: string
}

export interface CredentialAnchor {
  merkleRoot: string
  proofPath: ProofStep[]
  chainId: number | null
  contractAddress: string | null
  txHash: string | null
}

export interface Credential {
  id: string
  documentType: string
  issuer: { name: string; domain: string | null; publicKeyPem: string | null }
  credentialSubject: Record<string, unknown>
  proof: {
    salt: string
    documentHash: string
    signerMemberId: string | null
    approverMemberId: string | null
    managerSignature: string | null
    hrSignature: string | null
  }
  anchor: CredentialAnchor | null
  revocation: { revokedAt: string | number | null } | null
}

export type CheckKind = 'pass' | 'fail' | 'warn'

export interface CheckLine {
  key: string
  label: string
  kind: CheckKind
  detail: string
  // The intermediate values the CLI prints under --explain, so a viewer can redo the maths.
  explain: string[]
}

export interface ReportAnchor {
  chainId: number | null
  contractAddress: string | null
  txHash: string | null
  merkleRoot: string
  explorerTxUrl: string | null
  explorerContractUrl: string | null
}

export interface CredentialReport {
  documentType: string
  credentialId: string
  issuerName: string
  issuerDomain: string | null
  keyFingerprint: string | null
  documentHash: string
  lines: CheckLine[]
  summary: { kind: CheckKind; text: string }
  failed: boolean
  anchor: ReportAnchor | null
  // Host of the public RPC that answered the on-chain reads; null when none were made.
  rpcUsed: string | null
}
