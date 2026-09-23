import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FieldCipher,
  FieldDecryptionError,
} from '../key-management/field-cipher.js';
import { LocalKmsService } from '../key-management/local-kms.service.js';
import { EncryptedStorageService } from './encrypted-storage.service.js';
import { StorageService, StoredObject } from './storage.service.js';

// Minimal in-memory stand-in for the wrapped driver (LocalStorageService in production),
// so these tests exercise only the encryption decorator, not the filesystem.
class MemoryStorage extends StorageService {
  private readonly files = new Map<string, Buffer>();

  put(key: string, data: Buffer): Promise<StoredObject> {
    this.files.set(key, data);
    return Promise.resolve({ key, url: this.getUrl(key) });
  }

  get(key: string): Promise<Buffer> {
    const data = this.files.get(key);
    if (!data) return Promise.reject(new Error(`not found: ${key}`));
    return Promise.resolve(data);
  }

  delete(key: string): Promise<void> {
    this.files.delete(key);
    return Promise.resolve();
  }

  getUrl(key: string): string {
    return `/mem/${key}`;
  }
}

describe('EncryptedStorageService (R10 storage at rest)', () => {
  let dir: string;
  let inner: MemoryStorage;
  let storage: EncryptedStorageService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cv-enc-storage-'));
    const env: Record<string, string> = {
      STORAGE_LOCAL_DIR: dir,
      KMS_MASTER_KEY: randomBytes(32).toString('base64'),
    };
    const kms = new LocalKmsService({
      get: (name: string) => env[name],
    } as never);
    inner = new MemoryStorage();
    storage = new EncryptedStorageService(inner, new FieldCipher(kms));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('round-trips a stored buffer through encryption', async () => {
    const data = Buffer.from('%PDF-1.7 fake pdf bytes');

    await storage.put('documents/doc-1.pdf', data, 'application/pdf');

    const raw = await inner.get('documents/doc-1.pdf');
    expect(FieldCipher.isEncryptedBuffer(raw)).toBe(true);
    expect(raw.equals(data)).toBe(false);
    await expect(storage.get('documents/doc-1.pdf')).resolves.toEqual(data);
  });

  it('passes plaintext bytes through unchanged (objects written before R10)', async () => {
    const legacy = Buffer.from('%PDF-1.7 legacy plaintext');
    await inner.put('documents/legacy.pdf', legacy);

    await expect(storage.get('documents/legacy.pdf')).resolves.toEqual(legacy);
  });

  it('binds ciphertext to its key: reading it back under a different key fails', async () => {
    await storage.put('documents/a.pdf', Buffer.from('a-content'));
    const raw = await inner.get('documents/a.pdf');
    // Simulates a copy/rename bug that moves ciphertext to a different key without
    // re-encrypting — the AAD binds the blob to the key it was written under.
    await inner.put('documents/b.pdf', raw);

    await expect(storage.get('documents/b.pdf')).rejects.toBeInstanceOf(
      FieldDecryptionError,
    );
  });

  it('delegates delete and getUrl to the wrapped driver', async () => {
    await storage.put('documents/c.pdf', Buffer.from('c'));

    expect(storage.getUrl('documents/c.pdf')).toBe(
      inner.getUrl('documents/c.pdf'),
    );
    await storage.delete('documents/c.pdf');
    await expect(inner.get('documents/c.pdf')).rejects.toThrow();
  });
});
