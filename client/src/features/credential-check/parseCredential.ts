import type { Credential, CredentialAnchor, ProofStep } from './types.ts'

// Shape validation only — whether the values are TRUE is verifyCredential's job. Fields the
// CLI tolerates as null (a missing signature, member id or key) stay nullable here so they
// surface as a failed check line, exactly as the CLI reports them, rather than as a parse
// error that would hide which check broke.

export type ParseResult = { ok: true; credential: Credential } | { ok: false; error: string }

class ShapeError extends Error {}

type JsonObject = Record<string, unknown>

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function objectAt(parent: JsonObject, key: string, path: string): JsonObject {
  const value = parent[key]
  if (value === undefined || value === null) throw new ShapeError(`${path} is missing`)
  if (!isObject(value)) throw new ShapeError(`${path} must be an object`)
  return value
}

function stringAt(parent: JsonObject, key: string, path: string): string {
  const value = parent[key]
  if (value === undefined || value === null) throw new ShapeError(`${path} is missing`)
  if (typeof value !== 'string') throw new ShapeError(`${path} must be a string`)
  return value
}

function nullableStringAt(parent: JsonObject, key: string, path: string): string | null {
  const value = parent[key]
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw new ShapeError(`${path} must be a string or null`)
  return value
}

function parseProofPath(value: unknown): ProofStep[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new ShapeError('anchor.proofPath must be an array')
  return value.map((step: unknown, i) => {
    if (!isObject(step) || typeof step.hash !== 'string') {
      throw new ShapeError(`anchor.proofPath[${i}].hash must be a string`)
    }
    return { hash: step.hash }
  })
}

// A missing chainId is not the same as null: null is the local simulator, a deliberate value.
function parseChainId(value: unknown): number | null {
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ShapeError('anchor.chainId must be an integer or null')
  }
  return value
}

function parseAnchor(root: JsonObject): CredentialAnchor | null {
  const anchor = root.anchor
  if (anchor === undefined || anchor === null) return null
  if (!isObject(anchor)) throw new ShapeError('anchor must be an object or null')
  return {
    merkleRoot: stringAt(anchor, 'merkleRoot', 'anchor.merkleRoot'),
    proofPath: parseProofPath(anchor.proofPath),
    chainId: parseChainId(anchor.chainId),
    contractAddress: nullableStringAt(anchor, 'contractAddress', 'anchor.contractAddress'),
    txHash: nullableStringAt(anchor, 'txHash', 'anchor.txHash'),
  }
}

function parseRevocation(root: JsonObject): Credential['revocation'] {
  const revocation = root.revocation
  if (revocation === undefined || revocation === null) return null
  // Any non-null block means "revoked" to the CLI, even a malformed one, so never drop it.
  const at = isObject(revocation) ? revocation.revokedAt : null
  return { revokedAt: typeof at === 'string' || typeof at === 'number' ? at : null }
}

function toCredential(root: JsonObject): Credential {
  const issuer = objectAt(root, 'issuer', 'issuer')
  const proof = objectAt(root, 'proof', 'proof')
  return {
    id: stringAt(root, 'id', 'id'),
    documentType: stringAt(root, 'documentType', 'documentType'),
    issuer: {
      name: stringAt(issuer, 'name', 'issuer.name'),
      domain: nullableStringAt(issuer, 'domain', 'issuer.domain'),
      publicKeyPem: nullableStringAt(issuer, 'publicKeyPem', 'issuer.publicKeyPem'),
    },
    credentialSubject: objectAt(root, 'credentialSubject', 'credentialSubject'),
    proof: {
      salt: stringAt(proof, 'salt', 'proof.salt'),
      documentHash: stringAt(proof, 'documentHash', 'proof.documentHash'),
      signerMemberId: nullableStringAt(proof, 'signerMemberId', 'proof.signerMemberId'),
      approverMemberId: nullableStringAt(proof, 'approverMemberId', 'proof.approverMemberId'),
      managerSignature: nullableStringAt(proof, 'managerSignature', 'proof.managerSignature'),
      hrSignature: nullableStringAt(proof, 'hrSignature', 'proof.hrSignature'),
    },
    anchor: parseAnchor(root),
    revocation: parseRevocation(root),
  }
}

export function parseCredential(text: string): ParseResult {
  let root: unknown
  try {
    // Editors on Windows like to prepend a BOM, which JSON.parse rejects.
    root = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch {
    return { ok: false, error: "This file isn't valid JSON, so it can't be a CareerVault credential." }
  }
  if (!isObject(root)) {
    return { ok: false, error: "This isn't a CareerVault credential file: expected a JSON object." }
  }
  try {
    return { ok: true, credential: toCredential(root) }
  } catch (err) {
    if (!(err instanceof ShapeError)) throw err
    return { ok: false, error: `This isn't a CareerVault credential file: ${err.message}.` }
  }
}
