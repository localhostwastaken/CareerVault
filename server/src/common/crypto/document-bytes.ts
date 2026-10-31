/**
 * Deterministic byte serialization of a document (R4). The ONLY input to the document hash
 * and to the per-signer HMAC seal.
 *
 * Replaces RFC 8785 JCS. JCS existed so that independent verifiers could rebuild the hashed
 * text from a JSON file. Verification is now server-only, so a fixed binary layout we own
 * end to end is simpler and has no text-formatting edge cases (number printing, escapes).
 *
 * Every value is tag ‖ payload:
 *   0x01 string   u32be(byte length) ‖ UTF-8 bytes
 *   0x02 integer  int64be           (safe integers only; amounts are stored in paise)
 *   0x03 boolean  0x00 | 0x01
 *   0x04 array    u32be(count) ‖ each item
 *   0x05 object   u32be(count) ‖ for each key in bytewise UTF-8 order: string(key) ‖ value
 * Length prefixes make the encoding unambiguous: {a:"ab",b:"c"} and {a:"a",b:"bc"} cannot
 * produce the same bytes, which plain concatenation would allow. Floats and null are
 * rejected, never coerced: normalizeSubject strips null/empty values before this runs.
 *
 * documentBytes = "CVDOC" ‖ 0x02 ‖ string(id) ‖ string(type) ‖ string(orgId) ‖ string(holderId)
 *                 ‖ value(subject) ‖ salt (32 raw bytes)
 * statementBytes = "CVSTM" ‖ 0x02 ‖ string(documentHash) ‖ string(seal) ‖ string(role)
 *                 ‖ string(memberId) ‖ string(employeeKeyId)
 */

const TAG = {
  string: 0x01,
  integer: 0x02,
  boolean: 0x03,
  array: 0x04,
  object: 0x05,
} as const;

const DOCUMENT_MAGIC = Buffer.from('CVDOC', 'ascii');
const STATEMENT_MAGIC = Buffer.from('CVSTM', 'ascii');
const FORMAT_VERSION = Buffer.from([0x02]);

export interface DocumentIdentity {
  id: string;
  type: string;
  organizationId: string;
  holderId: string;
}

export interface SigningStatement {
  documentHash: string;
  seal: string;
  role: 'MANAGER' | 'HR';
  memberId: string;
  employeeKeyId: string;
}

function u32(value: number): Buffer {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(value);
  return out;
}

function encodeString(value: string): Buffer {
  const bytes = Buffer.from(value, 'utf8');
  return Buffer.concat([Buffer.from([TAG.string]), u32(bytes.length), bytes]);
}

export function encodeValue(value: unknown): Buffer {
  if (typeof value === 'string') return encodeString(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value))
      throw new TypeError(`Only safe integers can be encoded, got ${value}`);
    const out = Buffer.alloc(9);
    out[0] = TAG.integer;
    out.writeBigInt64BE(BigInt(value), 1);
    return out;
  }
  if (typeof value === 'boolean')
    return Buffer.from([TAG.boolean, value ? 1 : 0]);
  if (Array.isArray(value))
    return Buffer.concat([
      Buffer.from([TAG.array]),
      u32(value.length),
      ...value.map(encodeValue),
    ]);
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort((a, b) =>
      Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')),
    );
    const entries = keys.flatMap((key) => [
      encodeString(key),
      encodeValue((value as Record<string, unknown>)[key]),
    ]);
    return Buffer.concat([
      Buffer.from([TAG.object]),
      u32(keys.length),
      ...entries,
    ]);
  }
  throw new TypeError(
    `Cannot encode ${value === null ? 'null' : typeof value}`,
  );
}

export function documentBytes(
  identity: DocumentIdentity,
  subject: unknown,
  saltHex: string,
): Buffer {
  if (!/^[0-9a-f]{64}$/.test(saltHex))
    throw new TypeError('The salt must be 32 bytes of lowercase hex');
  return Buffer.concat([
    DOCUMENT_MAGIC,
    FORMAT_VERSION,
    encodeString(identity.id),
    encodeString(identity.type),
    encodeString(identity.organizationId),
    encodeString(identity.holderId),
    encodeValue(subject),
    Buffer.from(saltHex, 'hex'),
  ]);
}

export function statementBytes(statement: SigningStatement): Buffer {
  return Buffer.concat([
    STATEMENT_MAGIC,
    FORMAT_VERSION,
    encodeString(statement.documentHash),
    encodeString(statement.seal),
    encodeString(statement.role),
    encodeString(statement.memberId),
    encodeString(statement.employeeKeyId),
  ]);
}
