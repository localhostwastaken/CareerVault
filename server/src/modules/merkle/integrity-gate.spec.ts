import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashDocument } from '../../common/utils/crypto.util.js';
import { ENCRYPTED_FIELDS } from '../../prisma/encryption/encrypted-fields.js';
import { createFieldEncryptionHandler } from '../../prisma/encryption/field-encryption.extension.js';
import { FieldCipher } from '../../services/key-management/field-cipher.js';
import { LocalKmsService } from '../../services/key-management/local-kms.service.js';
import { integrityGate } from './integrity-gate.js';

/**
 * Nothing reaches CareerVault's own anchor wallet unless its stored content and salt still
 * open and still recompute its documentHash. Reads run through the real R10 handler, as
 * PrismaService's do, so strict mode is what refuses a planted plaintext row.
 */

type Row = Record<string, unknown>;

const CONTENT = { employeeName: 'Asha Rao', designation: 'Engineer' };
const SALT = 'c0'.repeat(32);
const HASH = hashDocument(CONTENT, SALT);
const NO_SIGNATURES = {
  managerSignature: null,
  hrSignature: null,
  revocationReasonText: null,
};

describe('integrityGate (batch-time R4 + R10 check)', () => {
  let dir: string;
  let cipher: FieldCipher;
  let rows: Map<string, Row>;
  let logged: string[];
  let selects: unknown[];

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cv-gate-'));
    const env: Record<string, string> = {
      STORAGE_LOCAL_DIR: dir,
      KMS_MASTER_KEY: randomBytes(32).toString('base64'),
    };
    cipher = new FieldCipher(
      new LocalKmsService({ get: (name: string) => env[name] } as never),
    );
    rows = new Map();
    logged = [];
    selects = [];
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const gate = (ids: string[], strict = true) => {
    const handler = createFieldEncryptionHandler(cipher, { strict });
    const prisma = {
      document: {
        findUnique: (args: { where: { id: string }; select: unknown }) => {
          selects.push(args.select);
          const row = rows.get(args.where.id);
          return handler({
            model: 'Document',
            operation: 'findUnique',
            args,
            query: () => Promise.resolve(row ? structuredClone(row) : null),
          });
        },
      },
    };
    const logger = { error: (message: string) => logged.push(message) };
    const candidates = ids.map((id) => ({ id, documentHash: HASH }));
    return integrityGate(prisma as never, candidates, logger);
  };

  const sealed = async (content: unknown, salt: string): Promise<Row> => {
    const [contentJson, sealedSalt] = await cipher.encrypt([
      { label: 'contentJson', plaintext: JSON.stringify(content) },
      { label: 'salt', plaintext: salt },
    ]);
    return { contentJson, salt: sealedSalt, ...NO_SIGNATURES };
  };

  // What a DB writer without the KEK can plant: self-consistent, but plaintext.
  const planted: Row = {
    contentJson: CONTENT,
    salt: SALT,
    managerSignature: 'c2lnbmVkLWJ5LWFuLWF0dGFja2Vy',
    hrSignature: 'c2lnbmVkLWJ5LWFuLWF0dGFja2Vy',
    revocationReasonText: null,
  };

  it('passes a document whose sealed content and salt recompute its hash', async () => {
    rows.set('valid', await sealed(CONTENT, SALT));

    await expect(gate(['valid'])).resolves.toEqual([
      { id: 'valid', documentHash: HASH },
    ]);
    expect(logged).toEqual([]);
  });

  it('skips a planted plaintext row in strict mode and logs no value', async () => {
    rows.set('planted', planted);

    await expect(gate(['planted'])).resolves.toEqual([]);
    expect(logged).toHaveLength(1);
    expect(logged[0]).toContain('planted');
    expect(logged[0]).toContain('is not an R10 envelope');
    expect(logged[0]).not.toContain('Asha Rao');
    expect(logged[0]).not.toContain(SALT);
  });

  it('lets the same planted row through when strict mode is off (the dev-only gap)', async () => {
    rows.set('planted', planted);

    await expect(gate(['planted'], false)).resolves.toHaveLength(1);
  });

  it('skips a document whose content no longer recomputes its hash', async () => {
    rows.set('altered', await sealed({ ...CONTENT, designation: 'CTO' }, SALT));

    await expect(gate(['altered'])).resolves.toEqual([]);
    expect(logged[0]).toContain('do not recompute its documentHash');
  });

  it('skips a document with no salt', async () => {
    rows.set('erased', { ...(await sealed(CONTENT, SALT)), salt: null });

    await expect(gate(['erased'])).resolves.toEqual([]);
    expect(logged[0]).toContain('no salt');
  });

  it('skips an envelope that fails authentication, e.g. one moved from another field', async () => {
    const [moved] = await cipher.encrypt([
      { label: 'hrSignature', plaintext: SALT },
    ]);
    rows.set('moved', { ...(await sealed(CONTENT, SALT)), salt: moved });

    await expect(gate(['moved'])).resolves.toEqual([]);
    expect(logged[0]).toContain('could not be decrypted');
  });

  it('skips a document that no longer exists', async () => {
    await expect(gate(['gone'])).resolves.toEqual([]);
    expect(logged[0]).toContain('gone');
  });

  it('reads every encrypted Document field, so strict mode covers the signatures too', async () => {
    rows.set('forged-signature', {
      ...(await sealed(CONTENT, SALT)),
      managerSignature: 'c2lnbmVkLWJ5LWFuLWF0dGFja2Vy',
    });

    await expect(gate(['forged-signature'])).resolves.toEqual([]);
    expect(Object.keys(selects[0] as Row).sort()).toEqual(
      [...ENCRYPTED_FIELDS.Document].sort(),
    );
  });

  it('keeps the valid documents of a mixed batch, in order', async () => {
    rows.set('first', await sealed(CONTENT, SALT));
    rows.set('planted', planted);
    rows.set('last', await sealed(CONTENT, SALT));

    const passed = await gate(['first', 'planted', 'last']);

    expect(passed.map((doc) => doc.id)).toEqual(['first', 'last']);
    expect(logged).toHaveLength(1);
  });
});
