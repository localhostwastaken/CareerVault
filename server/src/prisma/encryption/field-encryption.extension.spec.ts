import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Prisma } from '../../generated/prisma/client.js';
import {
  ENVELOPE_PREFIX,
  FieldCipher,
  FieldDecryptionError,
  isEnvelope,
} from '../../services/key-management/field-cipher.js';
import { DataKeyUnavailableError } from '../../services/key-management/key-management.service.js';
import { LocalKmsService } from '../../services/key-management/local-kms.service.js';
import { createFieldEncryptionHandler } from './field-encryption.extension.js';

type Row = Record<string, unknown>;

const DOCUMENT_FIELDS = [
  'contentJson',
  'salt',
  'managerSignature',
  'hrSignature',
  'revocationReasonText',
];

describe('field-encryption extension (R10)', () => {
  let dir: string;
  let cipher: FieldCipher;
  let dataKeys: number;

  /** A KMS under its own random master key, i.e. a separate deployment. */
  const localKms = () => {
    const env: Record<string, string> = {
      STORAGE_LOCAL_DIR: dir,
      KMS_MASTER_KEY: randomBytes(32).toString('base64'),
    };
    return new LocalKmsService({ get: (name: string) => env[name] } as never);
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cv-field-ext-'));
    const kms = localKms();
    dataKeys = 0;
    // Real crypto, counted, so the tests pin one data key per written row.
    cipher = new FieldCipher({
      generateDataKey: () => {
        dataKeys += 1;
        return kms.generateDataKey();
      },
      decryptDataKey: (wrapped: string, keyId: string) =>
        kms.decryptDataKey(wrapped, keyId),
    } as never);
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  // Stands in for Prisma's `query`: records the args the extension forwards and answers
  // with whatever the test says the database returned.
  const run = async (
    model: string,
    operation: string,
    args: Row,
    reply: (sent: Row) => unknown = () => ({}),
  ) => {
    let sent: Row = {};
    const result = await createFieldEncryptionHandler(cipher)({
      model,
      operation,
      args,
      query: (next) => {
        sent = next as Row;
        return Promise.resolve(reply(sent));
      },
    });
    return { sent, result };
  };

  const open = (label: string, envelope: unknown) =>
    cipher.decrypt(label, envelope as string);

  const openJson = async (envelope: unknown): Promise<unknown> =>
    JSON.parse(await open('contentJson', envelope));

  const seal = async (fields: Row) => {
    const labels = Object.keys(fields);
    const envelopes = await cipher.encrypt(
      labels.map((label) => ({ label, plaintext: String(fields[label]) })),
    );
    return Object.fromEntries(labels.map((l, i) => [l, envelopes[i]]));
  };

  describe('writes', () => {
    it('seals every configured Document field on create and leaves the rest', async () => {
      const data = {
        type: 'EXPERIENCE_LETTER',
        documentHash: 'ab'.repeat(32),
        contentJson: { employeeName: 'Asha Rao', ctc: 1_200_000 },
        salt: 'c0ffee',
        managerSignature: 'bWFuYWdlcg==',
        hrSignature: 'aHI=',
        revocationReasonText: 'Issued in error',
      };

      const { sent } = await run('Document', 'create', { data });
      const stored = sent.data as Row;

      expect(stored.type).toBe(data.type);
      expect(stored.documentHash).toBe(data.documentHash);
      for (const field of DOCUMENT_FIELDS)
        expect(isEnvelope(stored[field])).toBe(true);
      expect(await openJson(stored.contentJson)).toEqual(data.contentJson);
      await expect(open('salt', stored.salt)).resolves.toBe('c0ffee');
      await expect(
        open('revocationReasonText', stored.revocationReasonText),
      ).resolves.toBe('Issued in error');
      expect(data.salt).toBe('c0ffee');
      expect(dataKeys).toBe(1);
    });

    it('seals each createMany row under its own data key', async () => {
      const rows = [1, 2, 3].map((n) => ({
        versionNumber: n,
        contentJson: { n },
        changeSummary: `v${n}`,
      }));

      const { sent } = await run('DocumentVersion', 'createMany', {
        data: rows,
      });
      const stored = sent.data as Row[];

      expect(stored).toHaveLength(3);
      for (const [i, row] of stored.entries()) {
        expect(row.versionNumber).toBe(i + 1);
        expect(await openJson(row.contentJson)).toEqual({ n: i + 1 });
        await expect(open('changeSummary', row.changeSummary)).resolves.toBe(
          `v${i + 1}`,
        );
      }
      expect(dataKeys).toBe(3);
    });

    it('seals the value inside an explicit { set } on update', async () => {
      const { sent } = await run('Document', 'update', {
        where: { id: 'd1' },
        data: { salt: { set: 'c0ffee' }, status: 'PENDING_HR' },
      });
      const stored = sent.data as { salt: { set: string }; status: string };

      expect(stored.status).toBe('PENDING_HR');
      await expect(open('salt', stored.salt.set)).resolves.toBe('c0ffee');
    });

    it('seals both branches of an upsert', async () => {
      const { sent } = await run('Document', 'upsert', {
        where: { id: 'd1' },
        create: { contentJson: { a: 1 }, salt: 'c0ffee' },
        update: { hrSignature: 'aHI=' },
      });
      const create = sent.create as Row;
      const update = sent.update as Row;

      expect(await openJson(create.contentJson)).toEqual({ a: 1 });
      await expect(open('salt', create.salt)).resolves.toBe('c0ffee');
      await expect(open('hrSignature', update.hrSignature)).resolves.toBe(
        'aHI=',
      );
    });

    it('seals the shared data of an updateMany and keeps its where clause', async () => {
      const where = { id: 'd1', status: 'PENDING_HR' };

      const { sent } = await run('Document', 'updateMany', {
        where,
        data: { hrSignature: 'aHI=', status: 'ISSUED' },
      });
      const stored = sent.data as Row;

      expect(sent.where).toEqual(where);
      expect(stored.status).toBe('ISSUED');
      await expect(open('hrSignature', stored.hrSignature)).resolves.toBe(
        'aHI=',
      );
    });

    it('leaves envelopes, nulls and Prisma null sentinels as they are', async () => {
      const { contentJson } = await seal({ contentJson: '{"a":1}' });
      dataKeys = 0;
      const data = {
        contentJson,
        salt: null,
        managerSignature: { set: null },
        hrSignature: undefined,
      };

      const document = await run('Document', 'update', {
        where: { id: 'd1' },
        data,
      });
      const version = await run('DocumentVersion', 'create', {
        data: { contentJson: Prisma.JsonNull },
      });

      expect(document.sent.data).toEqual(data);
      expect((version.sent.data as Row).contentJson).toBe(Prisma.JsonNull);
      expect(dataKeys).toBe(0);
    });

    it('seals free text that merely looks like an envelope, so it reads back as typed', async () => {
      const reason = `${ENVELOPE_PREFIX}pasted into the revocation reason`;

      const { sent, result } = await run(
        'Document',
        'update',
        { where: { id: 'd1' }, data: { revocationReasonText: reason } },
        (args) => ({ ...(args.data as Row) }),
      );

      expect((sent.data as Row).revocationReasonText).not.toBe(reason);
      expect(result).toEqual({ revocationReasonText: reason });
    });

    it('surfaces an envelope whose data key this deployment cannot unwrap, instead of resealing it', async () => {
      const [salt] = await new FieldCipher(localKms()).encrypt([
        { label: 'salt', plaintext: 'c0ffee' },
      ]);

      await expect(
        run('Document', 'update', { where: { id: 'd1' }, data: { salt } }),
      ).rejects.toBeInstanceOf(DataKeyUnavailableError);
    });

    it('does not touch a Json column that merely holds an encrypted field name', async () => {
      const args = { data: { action: 'X', newValue: { salt: 'x' } } };

      const { sent } = await run('AuditLog', 'create', args);

      expect(sent).toEqual(args);
      expect(dataKeys).toBe(0);
    });

    it.each([
      ['create', { create: { contentJson: {} } }],
      ['createMany', { createMany: { data: [{ salt: 'x' }] } }],
      ['update', { update: { where: { id: 'd1' }, data: { salt: 'x' } } }],
      [
        'upsert',
        { upsert: { where: { id: 'd1' }, create: {}, update: { salt: 'x' } } },
      ],
      [
        'connectOrCreate',
        { connectOrCreate: { where: { id: 'd1' }, create: { salt: 'x' } } },
      ],
    ])(
      'refuses a nested %s that would store an encrypted field as plaintext',
      async (_, documents) => {
        await expect(
          run('Organization', 'update', {
            where: { id: 'o1' },
            data: { documents },
          }),
        ).rejects.toThrow(
          /^Nested write of encrypted field (contentJson|salt) is not supported; write Document\/DocumentVersion at the top level$/,
        );
      },
    );

    it('refuses a DocumentVersion written through its Document', async () => {
      await expect(
        run('Document', 'update', {
          where: { id: 'd1' },
          data: {
            salt: 'c0ffee',
            versions: { create: { changeSummary: 'Signed by manager' } },
          },
        }),
      ).rejects.toThrow('Nested write of encrypted field changeSummary');
    });
  });

  describe('reads', () => {
    it('stores Json as an envelope string and reads it back as the original value', async () => {
      // The quoted value looks like an envelope; decrypted content is caller data and
      // must never be walked for fields of its own.
      const content = {
        employeeName: 'Asha Rao',
        quote: { salt: `${ENVELOPE_PREFIX}typed-by-a-user` },
        tags: ['a', 1, true, null],
      };

      const { sent, result } = await run(
        'DocumentVersion',
        'create',
        { data: { contentJson: content } },
        (args) => ({ id: 'v1', ...(args.data as Row) }),
      );

      expect(typeof (sent.data as Row).contentJson).toBe('string');
      expect(result).toEqual({ id: 'v1', contentJson: content });
    });

    it('decrypts a Document included under another model', async () => {
      const sealed = await seal({
        contentJson: '{"employeeName":"Asha Rao"}',
        salt: 'c0ffee',
      });

      const { result } = await run(
        'SharedLink',
        'findUnique',
        { where: { urlToken: 't' }, include: { document: true } },
        () => ({
          urlToken: 't',
          document: { ...sealed, organization: { name: 'Acme' } },
        }),
      );

      expect(result).toEqual({
        urlToken: 't',
        document: {
          contentJson: { employeeName: 'Asha Rao' },
          salt: 'c0ffee',
          organization: { name: 'Acme' },
        },
      });
    });

    it('decrypts every row of an array result, nested lists included', async () => {
      const issuedAt = new Date('2026-01-01T00:00:00Z');
      const rows = await Promise.all(
        [1, 2].map(async (n) => ({
          id: `d${n}`,
          issuedAt,
          ...(await seal({ salt: `salt-${n}`, hrSignature: `hr-${n}` })),
          versions: [await seal({ contentJson: `{"n":${n}}` })],
        })),
      );

      const { result } = await run('Document', 'findMany', {}, () => rows);

      expect(result).toEqual(
        [1, 2].map((n) => ({
          id: `d${n}`,
          issuedAt,
          salt: `salt-${n}`,
          hrSignature: `hr-${n}`,
          versions: [{ contentJson: { n } }],
        })),
      );
      expect((result as Row[])[0].issuedAt).toBeInstanceOf(Date);
    });

    it('passes legacy plaintext through untouched', async () => {
      // Legacy Json is caller data too: its lookalike must not be opened.
      const legacy = {
        id: 'd1',
        contentJson: {
          note: 'written before R10',
          quote: { salt: ENVELOPE_PREFIX },
        },
        salt: 'c0ffee',
        managerSignature: null,
      };

      const { result } = await run(
        'Document',
        'findUnique',
        { where: { id: 'd1' } },
        () => structuredClone(legacy),
      );

      expect(result).toEqual(legacy);
    });

    it('lets a decryption failure propagate unchanged', async () => {
      // A salt envelope moved into another column fails authentication (AAD mismatch).
      const { salt } = await seal({ salt: 'c0ffee' });

      await expect(
        run('Document', 'findUnique', { where: { id: 'd1' } }, () => ({
          hrSignature: salt,
        })),
      ).rejects.toBeInstanceOf(FieldDecryptionError);
    });
  });

  describe('filters', () => {
    // A query the guard lets through would fail with this instead of the expected error.
    const refuse = (model: string, args: Row) =>
      createFieldEncryptionHandler(cipher)({
        model,
        operation: 'findMany',
        args,
        query: () => Promise.reject(new Error('query must not run')),
      });

    it.each([
      [
        'Document',
        { where: { salt: 'abc' } },
        'filter on encrypted field salt',
      ],
      [
        'Document',
        { where: { AND: [{ hrSignature: 'x' }] } },
        'filter on encrypted field hrSignature',
      ],
      [
        'SharedLink',
        { where: { document: { contentJson: { equals: {} } } } },
        'filter on encrypted field contentJson',
      ],
      [
        'Document',
        { orderBy: { salt: 'asc' } },
        'sort on encrypted field salt',
      ],
      [
        'DocumentVersion',
        { orderBy: [{ createdAt: 'desc' }, { changeSummary: 'asc' }] },
        'sort on encrypted field changeSummary',
      ],
      [
        'DocumentVersion',
        { distinct: ['changeSummary'] },
        'use distinct on encrypted field changeSummary',
      ],
    ])(
      'refuses %s %j, which would compare ciphertext',
      async (model, args, message) => {
        await expect(refuse(model, args)).rejects.toThrow(`Cannot ${message}`);
      },
    );

    it.each([
      ['Document', { salt: null }],
      ['Document', { managerSignature: { not: null } }],
      ['Document', { salt: { equals: Prisma.DbNull } }],
      ['AuditLog', { newValue: { equals: { salt: 'x' } } }],
    ])('allows %s where %j', async (model, where) => {
      const { sent } = await run(model, 'findMany', { where });

      expect(sent.where).toEqual(where);
    });
  });
});
