import { Prisma } from '../../generated/prisma/client.js';
import {
  FieldCipher,
  FieldDecryptionError,
  isEnvelope,
} from '../../services/key-management/field-cipher.js';
import {
  ENCRYPTED_FIELD_NAMES,
  ENCRYPTED_FIELDS,
  JSON_FIELDS,
} from './encrypted-fields.js';

// R10 field encryption, applied where every query passes: the columns in ENCRYPTED_FIELDS
// hold only FieldCipher envelopes in Postgres, while every service keeps reading and
// writing plaintext through PrismaService unchanged.
//
// Prisma documents that query extensions see only the top-level operation, never the
// nested reads and writes it carries. Everything here is therefore keyed on field NAMES,
// which are unique to their models: a Document included under a SharedLink is decrypted
// because its `contentJson` key is recognisable, and a nested write that would store an
// encrypted field is refused, because this extension never gets the chance to seal it.
// Raw queries are not model operations, so they return the stored ciphertext.

type Row = Record<string, unknown>;

export interface FieldEncryptionOptions {
  // FIELD_ENCRYPTION_STRICT. A DB writer without the KEK cannot make an envelope, so the
  // only value they can plant in an encrypted column is plaintext. Strict reads refuse it;
  // off, it reads back as legacy data, which dev databases with pre-R10 rows still need.
  strict?: boolean;
}

/** Names the field only, never its value, so it is safe to log. */
export class PlaintextFieldError extends Error {
  constructor(readonly field: string) {
    super(
      `Field "${field}" holds a value that is not an R10 envelope; strict mode refuses plaintext in an encrypted column`,
    );
    this.name = 'PlaintextFieldError';
  }
}

export interface QueryCall {
  model?: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => PromiseLike<unknown>;
}

const WRITE_OPERATIONS: ReadonlySet<string> = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
]);
// Where a write carries its row data; upsert uses `create` and `update` instead of `data`.
const DATA_KEYS = ['data', 'create', 'update'] as const;
const RELATION_WRITES = [
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'connectOrCreate',
];
// Operators whose operand is a value being compared (for a Json column, arbitrary JSON that
// may hold a key such as `salt`) rather than a nested filter.
const VALUE_OPERATORS: ReadonlySet<string> = new Set([
  'equals',
  'not',
  'in',
  'notIn',
  'has',
  'hasEvery',
  'hasSome',
  'array_contains',
  'array_starts_with',
  'array_ends_with',
]);
const NULL_SENTINELS: ReadonlySet<unknown> = new Set([
  Prisma.DbNull,
  Prisma.JsonNull,
  Prisma.AnyNull,
]);
const FIELDS_BY_MODEL: ReadonlyMap<string, readonly string[]> = new Map(
  Object.entries(ENCRYPTED_FIELDS),
);

export function fieldEncryption(
  cipher: FieldCipher,
  options: FieldEncryptionOptions = {},
) {
  return Prisma.defineExtension({
    name: 'field-encryption',
    query: {
      $allModels: {
        $allOperations: createFieldEncryptionHandler(cipher, options),
      },
    },
  });
}

export function createFieldEncryptionHandler(
  cipher: FieldCipher,
  { strict = false }: FieldEncryptionOptions = {},
) {
  return async ({
    model,
    operation,
    args,
    query,
  }: QueryCall): Promise<unknown> => {
    let next = args;
    if (isRecord(args)) {
      assertNoEncryptedQuery(args);
      if (WRITE_OPERATIONS.has(operation)) {
        for (const key of DATA_KEYS) assertNoNestedEncryptedWrite(args[key]);
        const fields =
          model === undefined ? undefined : FIELDS_BY_MODEL.get(model);
        if (fields) next = await sealArgs(cipher, fields, args);
      }
    }
    const result = await query(next);
    await openResult(cipher, result, strict);
    return result;
  };
}

// ── writes ───────────────────────────────────────────────────────────────────

async function sealArgs(
  cipher: FieldCipher,
  fields: readonly string[],
  args: Row,
): Promise<Row> {
  const next: Row = { ...args };
  for (const key of DATA_KEYS) {
    const data = args[key];
    if (Array.isArray(data))
      next[key] = await Promise.all(
        data.map((row) => sealRow(cipher, fields, row)),
      );
    else if (data !== undefined)
      next[key] = await sealRow(cipher, fields, data);
  }
  return next;
}

/** One `encrypt` call, and so one data key, per row payload (updateMany shares one envelope). */
async function sealRow(
  cipher: FieldCipher,
  fields: readonly string[],
  row: unknown,
): Promise<unknown> {
  if (!isRecord(row)) return row;
  const entries: { label: string; plaintext: string }[] = [];
  for (const label of fields) {
    const plaintext = await plaintextOf(cipher, label, row[label]);
    if (plaintext !== undefined) entries.push({ label, plaintext });
  }
  if (entries.length === 0) return row;
  const envelopes = await cipher.encrypt(entries);
  const sealed: Row = { ...row };
  entries.forEach(({ label }, i) => {
    const value = row[label];
    sealed[label] =
      JSON_FIELDS.has(label) || !isRecord(value)
        ? envelopes[i]
        : { ...value, set: envelopes[i] };
  });
  return sealed;
}

// Undefined means "store as given": absent, null, a Prisma null sentinel, or an envelope
// that already opens as this field, since approve and resubmit copy stored content
// forward and ciphertext must never be sealed twice. Text that merely starts like an
// envelope (a pasted revocation reason) is sealed like any other: stored raw, it would
// fail every later read of the row.
async function plaintextOf(
  cipher: FieldCipher,
  field: string,
  value: unknown,
): Promise<string | undefined> {
  if (value === undefined || isNull(value)) return undefined;
  const json = JSON_FIELDS.has(field);
  // `{ set: 'x' }` is Prisma's explicit spelling of `'x'` for a string column.
  const inner = json || !isRecord(value) ? value : value.set;
  if (isEnvelope(inner) && (await opensAs(cipher, field, inner)))
    return undefined;
  if (json) return JSON.stringify(value);
  return typeof inner === 'string' ? inner : undefined;
}

// Only a FieldDecryptionError proves the text is not this field's ciphertext. A data key
// that cannot be unwrapped is a deployment fault and must surface, not trigger a reseal.
async function opensAs(
  cipher: FieldCipher,
  field: string,
  envelope: string,
): Promise<boolean> {
  try {
    await cipher.decrypt(field, envelope);
    return true;
  } catch (error) {
    if (error instanceof FieldDecryptionError) return false;
    throw error;
  }
}

// Only relation-write payloads are followed: an ordinary Json value may legitimately hold
// a key such as `salt`.
function assertNoNestedEncryptedWrite(data: unknown): void {
  for (const row of [data].flat()) {
    if (!isRecord(row)) continue;
    for (const value of Object.values(row)) {
      if (!isRecord(value) || !RELATION_WRITES.some((op) => op in value))
        continue;
      for (const nested of nestedRows(value)) {
        const field = Object.keys(nested).find((key) =>
          ENCRYPTED_FIELD_NAMES.has(key),
        );
        if (field)
          throw new Error(
            `Nested write of encrypted field ${field} is not supported; write Document/DocumentVersion at the top level`,
          );
        assertNoNestedEncryptedWrite(nested);
      }
    }
  }
}

// A relation write carries row data as the entry itself (create, a to-one update) or in
// its data / create / update member (createMany, update and updateMany with a where,
// connectOrCreate, upsert).
function nestedRows(payload: Row): Row[] {
  return RELATION_WRITES.flatMap((op) => [payload[op]].flat())
    .filter(isRecord)
    .flatMap((entry) => [
      entry,
      ...[entry.data].flat(),
      entry.create,
      entry.update,
    ])
    .filter(isRecord);
}

// ── filters ──────────────────────────────────────────────────────────────────

// Ciphertext never equals, orders or de-duplicates like its plaintext, so such a query
// would silently match nothing or sort at random. Testing for null is still meaningful.
function assertNoEncryptedQuery(args: Row): void {
  const filtered = encryptedKeyIn(args.where);
  if (filtered) throw new Error(`Cannot filter on encrypted field ${filtered}`);
  const sorted = encryptedKeyIn(args.orderBy);
  if (sorted) throw new Error(`Cannot sort on encrypted field ${sorted}`);
  const distinct = [args.distinct]
    .flat()
    .find(
      (field): field is string =>
        typeof field === 'string' && ENCRYPTED_FIELD_NAMES.has(field),
    );
  if (distinct)
    throw new Error(`Cannot use distinct on encrypted field ${distinct}`);
}

// Follows AND / OR / NOT, relation filters and nested orderBy objects, but never the
// operand of a comparison, which for a Json column is caller data.
function encryptedKeyIn(node: unknown): string | undefined {
  for (const item of Array.isArray(node) ? node : [node]) {
    if (!isRecord(item)) continue;
    for (const [key, value] of Object.entries(item)) {
      if (ENCRYPTED_FIELD_NAMES.has(key)) {
        if (!isNullTest(value)) return key;
      } else if (!VALUE_OPERATORS.has(key)) {
        const found = encryptedKeyIn(value);
        if (found) return found;
      }
    }
  }
  return undefined;
}

/** `null`, `{ equals: null }` or `{ not: null }`, a Prisma null sentinel counting as null. */
function isNullTest(value: unknown): boolean {
  if (value === undefined || isNull(value)) return true;
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length === 1 &&
    (entries[0][0] === 'equals' || entries[0][0] === 'not') &&
    isNull(entries[0][1])
  );
}

// ── reads ────────────────────────────────────────────────────────────────────

// Encrypted values are leaves: decrypted Json is caller data (it may hold a `salt` key of
// its own), and legacy plaintext is returned exactly as stored unless `strict` refuses it.
async function openResult(
  cipher: FieldCipher,
  result: unknown,
  strict: boolean,
): Promise<void> {
  const pending: Promise<void>[] = [];
  let refused: string | undefined;
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isRecord(node)) return;
    for (const [key, value] of Object.entries(node)) {
      if (!ENCRYPTED_FIELD_NAMES.has(key)) visit(value);
      else if (isEnvelope(value))
        pending.push(
          cipher.decrypt(key, value).then((plain) => {
            node[key] = JSON_FIELDS.has(key)
              ? (JSON.parse(plain) as unknown)
              : plain;
          }),
        );
      else if (strict && value !== undefined && !isNull(value)) refused ??= key;
    }
  };
  visit(result);
  // Awaited before refusing, so no decrypt already started is left to reject unobserved.
  await Promise.all(pending);
  if (refused) throw new PlaintextFieldError(refused);
}

// ── shared ───────────────────────────────────────────────────────────────────

const isNull = (value: unknown): boolean =>
  value === null || NULL_SENTINELS.has(value);

// Plain objects only: a Date, Buffer, Decimal or Prisma null sentinel is a value, and
// walking into one would read its internals as fields. (A bigint is not an object.) The
// check is structural, so a plain object built in another realm still counts.
function isRecord(value: unknown): value is Row {
  if (typeof value !== 'object' || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === null || Object.getPrototypeOf(proto) === null;
}
