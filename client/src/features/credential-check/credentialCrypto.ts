import canonicalize from 'canonicalize'
import type { ProofStep } from './types.ts'

// WebCrypto port of tools/verify-credential's "Step 0" primitives. Byte-for-byte the same
// algorithms, gated by the same tools/verify-credential/test-vectors.json.

type Bytes = Uint8Array<ArrayBuffer>

const utf8 = new TextEncoder()

// Mirrors Node's Buffer.from(hex, 'hex'): decoding stops at the first non-hex pair instead of
// throwing, so a malformed hash in a file folds and compares exactly as the CLI's would.
export function hexToBytes(hex: string): Bytes {
  const out = new Uint8Array(Math.floor(hex.length / 2))
  for (let i = 0; i < out.length; i++) {
    const pair = hex.slice(i * 2, i * 2 + 2)
    if (!/^[0-9a-fA-F]{2}$/.test(pair)) return out.slice(0, i)
    out[i] = parseInt(pair, 16)
  }
  return out
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// Node's base64 decoder also accepts the URL-safe alphabet and missing padding; atob does not.
export function base64ToBytes(b64: string): Bytes {
  const std = b64.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')
  const binary = atob(std.padEnd(std.length + ((4 - (std.length % 4)) % 4), '='))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

export async function sha256Hex(data: string | Bytes): Promise<string> {
  const bytes = typeof data === 'string' ? utf8.encode(data) : data
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
}

export function canonicalizeJson(value: unknown): string {
  const json = canonicalize(value)
  if (json === undefined) throw new Error('value is not JCS-canonicalizable')
  return json
}

export const hashDocument = (content: unknown, salt: string): Promise<string> =>
  sha256Hex(canonicalizeJson(content) + salt)

export const signingStatementHash = (documentHash: string, role: string, memberId: string): Promise<string> =>
  sha256Hex(canonicalizeJson({ v: 1, documentHash, role, memberId }))

const RS256 = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const

function importPublicKey(publicKeyPem: string): Promise<CryptoKey> {
  const body = publicKeyPem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '')
  if (body.includes('-----')) throw new Error('issuer.publicKeyPem is not an SPKI "PUBLIC KEY" PEM')
  return crypto.subtle.importKey('spki', base64ToBytes(body), RS256, true, ['verify'])
}

// The signer ran crypto.sign('sha256', <32 raw statement bytes>), which hashes those bytes
// again before the RSA step. WebCrypto's verify also hashes its message, so the message here
// is the raw digest bytes — passing the hex string would verify a different message.
export async function verifyStatement(
  publicKeyPem: string,
  statementHex: string,
  signatureB64: string,
): Promise<boolean> {
  const key = await importPublicKey(publicKeyPem)
  return crypto.subtle.verify(RS256, key, base64ToBytes(signatureB64), hexToBytes(statementHex))
}

// Hashes the re-exported SPKI DER (not the PEM text), so whitespace or line-wrapping
// differences in the file can't change the fingerprint an organization quotes out of band.
export async function keyFingerprint(publicKeyPem: string): Promise<string> {
  const key = await importPublicKey(publicKeyPem)
  return sha256Hex(new Uint8Array(await crypto.subtle.exportKey('spki', key)))
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i]
  return a.length - b.length
}

// Pairs are sorted bytewise because the server builds the tree with sortPairs: true, which
// also makes each step's `position` redundant — it is untrusted file data, so it is ignored.
// Leaves are the raw document-hash bytes (never re-hashed); an empty path means leaf = root.
export async function merkleRootFromProof(leafHex: string, proofPath: readonly ProofStep[]): Promise<string> {
  let acc = hexToBytes(leafHex)
  for (const step of proofPath) {
    const sibling = hexToBytes(step.hash)
    const [a, b] = compareBytes(acc, sibling) <= 0 ? [acc, sibling] : [sibling, acc]
    const pair = new Uint8Array(a.length + b.length)
    pair.set(a)
    pair.set(b, a.length)
    acc = new Uint8Array(await crypto.subtle.digest('SHA-256', pair))
  }
  return bytesToHex(acc)
}
