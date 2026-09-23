import { Injectable } from '@nestjs/common';
import { FieldCipher } from '../key-management/field-cipher.js';
import { StorageService, StoredObject } from './storage.service.js';

// R10 storage at rest: wraps whichever driver StorageModule selects so every object written
// to disk — issued PDFs today — is ciphertext, not a plaintext file anyone with filesystem or
// backup access could open. A decorator, not a driver: callers keep depending on
// StorageService alone, so pdf-generation.service.ts and document.controller.ts need no
// changes. `get` tolerates objects written before R10 existed (legacy passthrough).
@Injectable()
export class EncryptedStorageService extends StorageService {
  constructor(
    private readonly inner: StorageService,
    private readonly cipher: FieldCipher,
  ) {
    super();
  }

  async put(
    key: string,
    data: Buffer,
    contentType?: string,
  ): Promise<StoredObject> {
    const encrypted = await this.cipher.encryptBuffer(`file:${key}`, data);
    return this.inner.put(key, encrypted, contentType);
  }

  async get(key: string): Promise<Buffer> {
    const bytes = await this.inner.get(key);
    return FieldCipher.isEncryptedBuffer(bytes)
      ? this.cipher.decryptBuffer(`file:${key}`, bytes)
      : bytes;
  }

  delete(key: string): Promise<void> {
    return this.inner.delete(key);
  }

  getUrl(key: string): string {
    return this.inner.getUrl(key);
  }
}
