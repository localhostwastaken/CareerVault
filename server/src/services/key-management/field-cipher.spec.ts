import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ENVELOPE_PREFIX,
  FieldCipher,
  FieldDecryptionError,
  isEnvelope,
} from './field-cipher.js';
import { DataKeyUnavailableError } from './key-management.service.js';
import { LocalKmsService } from './local-kms.service.js';

const ENVELOPE =
  /^cvenc:v1:[0-9a-f]{16}:[A-Za-z0-9_-]+:[A-Za-z0-9_-]{16}:[A-Za-z0-9_-]+$/;

/** Envelope segments: cvenc, v1, keyId, wrappedDek, iv, ciphertext‖tag. */
const segment = (envelope: string, index: number): string =>
  envelope.split(':')[index];

describe('FieldCipher (R10 field encryption)', () => {
  let dir: string;

  // Real crypto behind a counting wrapper, so the tests pin how often the KMS is hit —
  // one data key per written row, one unwrap per row read — not just that values survive.
  const cipherOver = (masterKey = randomBytes(32)) => {
    const env: Record<string, string> = {
      STORAGE_LOCAL_DIR: dir,
      KMS_MASTER_KEY: masterKey.toString('base64'),
    };
    const kms = new LocalKmsService({
      get: (name: string) => env[name],
    } as never);
    const calls = { generate: 0, decrypt: 0 };
    const counted = {
      generateDataKey: () => {
        calls.generate += 1;
        return kms.generateDataKey();
      },
      decryptDataKey: (wrapped: string, keyId: string) => {
        calls.decrypt += 1;
        return kms.decryptDataKey(wrapped, keyId);
      },
    };
    return { cipher: new FieldCipher(counted as never), calls };
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cv-field-cipher-'));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('round-trips ASCII, Unicode and JSON text', async () => {
    const { cipher } = cipherOver();
    const values = [
      'Software Engineer',
      'श्रेया पाटील — 履歴書 ✅',
      JSON.stringify({ ctc: 1_200_000, notes: 'said "thanks"\n' }),
    ];

    const envelopes = await cipher.encrypt(
      values.map((plaintext) => ({ label: 'document.contentJson', plaintext })),
    );

    for (const [i, envelope] of envelopes.entries()) {
      await expect(
        cipher.decrypt('document.contentJson', envelope),
      ).resolves.toBe(values[i]);
    }
  });

  it('seals a whole row under one data key and returns envelopes in input order', async () => {
    const { cipher, calls } = cipherOver();
    const entries = [
      { label: 'a', plaintext: 'one' },
      { label: 'b', plaintext: 'two' },
      { label: 'c', plaintext: 'three' },
    ];

    const envelopes = await cipher.encrypt(entries);

    expect(calls.generate).toBe(1);
    expect(new Set(envelopes.map((e) => segment(e, 3))).size).toBe(1);
    for (const [i, { label, plaintext }] of entries.entries()) {
      await expect(cipher.decrypt(label, envelopes[i])).resolves.toBe(
        plaintext,
      );
    }
  });

  it('makes no KMS call for an empty batch', async () => {
    const { cipher, calls } = cipherOver();

    await expect(cipher.encrypt([])).resolves.toEqual([]);
    expect(calls.generate).toBe(0);
  });

  it('gives every field its own IV inside the documented envelope format', async () => {
    const { cipher } = cipherOver();

    const envelopes = await cipher.encrypt([
      { label: 'x', plaintext: 'same' },
      { label: 'x', plaintext: 'same' },
    ]);

    for (const envelope of envelopes) expect(envelope).toMatch(ENVELOPE);
    expect(envelopes[0].startsWith(ENVELOPE_PREFIX)).toBe(true);
    expect(segment(envelopes[0], 4)).not.toBe(segment(envelopes[1], 4));
    expect(envelopes[0]).not.toBe(envelopes[1]);
  });

  it('refuses a field opened under another label, without leaking its contents', async () => {
    const { cipher } = cipherOver();
    const plaintext = '+91 98200 00000';
    const [envelope] = await cipher.encrypt([
      { label: 'user.phone', plaintext },
    ]);

    const error = await cipher
      .decrypt('user.email', envelope)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FieldDecryptionError);
    const { message } = error as Error;
    expect(message).toContain('user.email');
    expect(message).not.toContain(plaintext);
    expect(message).not.toContain(segment(envelope, 5));
  });

  it('detects a single altered ciphertext character', async () => {
    const { cipher } = cipherOver();
    const [envelope] = await cipher.encrypt([
      { label: 'x', plaintext: 'hello world' },
    ]);
    const parts = envelope.split(':');
    // The first base64 character carries six significant bits, so this always changes a byte.
    parts[5] = (parts[5][0] === 'A' ? 'B' : 'A') + parts[5].slice(1);

    await expect(cipher.decrypt('x', parts.join(':'))).rejects.toBeInstanceOf(
      FieldDecryptionError,
    );
  });

  it('rejects a malformed envelope as a decryption failure', async () => {
    const { cipher, calls } = cipherOver();

    await expect(
      cipher.decrypt('x', `${ENVELOPE_PREFIX}not-an-envelope`),
    ).rejects.toBeInstanceOf(FieldDecryptionError);
    expect(calls.decrypt).toBe(0);
  });

  it('surfaces a master-key mismatch as DataKeyUnavailableError, not corrupt data', async () => {
    const [envelope] = await cipherOver().cipher.encrypt([
      { label: 'x', plaintext: 'secret' },
    ]);

    await expect(
      cipherOver().cipher.decrypt('x', envelope),
    ).rejects.toBeInstanceOf(DataKeyUnavailableError);
  });

  // What an examiner editing a cell's visible prefix in a table editor produces. Public
  // verification tells the two apart by comparing the key ids the error carries.
  it('reports an edited key id as a key mismatch, even once the genuine envelope was opened', async () => {
    const { cipher } = cipherOver();
    const [envelope] = await cipher.encrypt([{ label: 'x', plaintext: 's' }]);
    await cipher.decrypt('x', envelope);
    const parts = envelope.split(':');
    parts[2] = parts[2] === '0'.repeat(16) ? '1'.repeat(16) : '0'.repeat(16);

    const error = await cipher
      .decrypt('x', parts.join(':'))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DataKeyUnavailableError);
    expect((error as DataKeyUnavailableError).keyMismatch).toBe(true);
  });

  it('reports an edited wrapped data key under the right key id as a failed unwrap, not a key mismatch', async () => {
    const { cipher } = cipherOver();
    const [envelope] = await cipher.encrypt([{ label: 'x', plaintext: 's' }]);
    const parts = envelope.split(':');
    // The first base64 character carries six significant bits, so this always changes a byte.
    parts[3] = (parts[3][0] === 'A' ? 'B' : 'A') + parts[3].slice(1);

    const error = await cipher
      .decrypt('x', parts.join(':'))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DataKeyUnavailableError);
    expect((error as DataKeyUnavailableError).keyMismatch).toBe(false);
  });

  it('recognises envelopes and nothing else', async () => {
    const [envelope] = await cipherOver().cipher.encrypt([
      { label: 'x', plaintext: 'y' },
    ]);

    expect(isEnvelope(envelope)).toBe(true);
    expect(isEnvelope(null)).toBe(false);
    expect(isEnvelope(42)).toBe(false);
    expect(isEnvelope('Software Engineer')).toBe(false);
  });

  it('unwraps a row’s data key once however its fields are read', async () => {
    const { cipher, calls } = cipherOver();
    const [a, b, c] = await cipher.encrypt([
      { label: 'a', plaintext: '1' },
      { label: 'b', plaintext: '2' },
      { label: 'c', plaintext: '3' },
    ]);

    await Promise.all([cipher.decrypt('a', a), cipher.decrypt('b', b)]);
    await cipher.decrypt('c', c);

    expect(calls.decrypt).toBe(1);
  });

  it('seals raw bytes such as a stored PDF', async () => {
    const { cipher } = cipherOver();
    const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), randomBytes(4096)]);

    const blob = await cipher.encryptBuffer('document.pdf', pdf);

    expect(blob.toString('utf8')).toMatch(ENVELOPE);
    expect(FieldCipher.isEncryptedBuffer(blob)).toBe(true);
    expect(FieldCipher.isEncryptedBuffer(pdf)).toBe(false);
    expect(FieldCipher.isEncryptedBuffer(Buffer.alloc(0))).toBe(false);
    await expect(cipher.decryptBuffer('document.pdf', blob)).resolves.toEqual(
      pdf,
    );
  });

  it('passes its boot self-test over a working KMS', async () => {
    await expect(cipherOver().cipher.onModuleInit()).resolves.toBeUndefined();
  });

  it('refuses to boot when data keys do not round-trip', async () => {
    const kms = {
      generateDataKey: () =>
        Promise.resolve({
          plaintext: randomBytes(32),
          wrapped: 'AAAA',
          keyId: '0123456789abcdef',
        }),
      decryptDataKey: () => Promise.reject(new Error('KMS unreachable')),
    };

    await expect(new FieldCipher(kms as never).onModuleInit()).rejects.toThrow(
      /^Field encryption self-test failed: /,
    );
  });
});
