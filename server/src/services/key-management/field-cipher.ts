import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataKey, KeyManagementService } from './key-management.service.js';

// R10 field encryption. Values are sealed with AES-256-GCM under a per-row data key (DEK)
// that only the KMS can unwrap, so a database dump or backup alone reveals nothing, and
// the envelope carries everything needed to open it (binary parts base64url, unpadded):
//
//   cvenc:v1:<keyId>:<wrappedDek>:<iv>:<ciphertext‖tag>
//
// The label is bound in as AAD, so a ciphertext moved into a field with a different
// label fails authentication instead of decrypting as the wrong value.

export const ENVELOPE_PREFIX = 'cvenc:v1:';

const ENVELOPE =
  /^cvenc:v1:([0-9a-f]{16}):([A-Za-z0-9_-]+):([A-Za-z0-9_-]{16}):([A-Za-z0-9_-]+)$/;
const PREFIX_BYTES = Buffer.from(ENVELOPE_PREFIX, 'utf8');
const DEK_CACHE_LIMIT = 1000;
const CANARY_LABEL = 'field-cipher.canary';
const CANARY = 'careervault field-encryption self-test';

const aadFor = (label: string): Buffer =>
  Buffer.from(`careervault|${label}|v1`, 'utf8');

export function isEnvelope(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(ENVELOPE_PREFIX);
}

/** Names the field only, never its plaintext or ciphertext, so it is safe to log. */
export class FieldDecryptionError extends Error {
  constructor(readonly label: string) {
    super(
      `Field "${label}" could not be decrypted: the envelope is malformed or failed authentication`,
    );
    this.name = 'FieldDecryptionError';
  }
}

@Injectable()
export class FieldCipher implements OnModuleInit {
  // Holds the in-flight unwrap rather than its result, so a row's fields read concurrently
  // still cost one KMS call. FIFO-capped so a long-lived process does not keep every DEK.
  private readonly dekCache = new Map<string, Promise<Buffer>>();

  constructor(private readonly kms: KeyManagementService) {}

  // A KMS that can mint data keys but not open them would let the app write rows nobody
  // can read back; refusing to boot is the only safe outcome.
  async onModuleInit(): Promise<void> {
    try {
      const [envelope] = await this.encrypt([
        { label: CANARY_LABEL, plaintext: CANARY },
      ]);
      if ((await this.decrypt(CANARY_LABEL, envelope)) !== CANARY)
        throw new Error('decrypted value did not match');
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Field encryption self-test failed: ${reason}`, {
        cause: error,
      });
    }
  }

  /** One data key per call, i.e. per row payload (updateMany shares one envelope), with a fresh IV and AAD per entry. */
  async encrypt(
    entries: ReadonlyArray<{ label: string; plaintext: string }>,
  ): Promise<string[]> {
    if (entries.length === 0) return [];
    const dataKey = await this.kms.generateDataKey();
    return entries.map(({ label, plaintext }) =>
      this.seal(dataKey, label, Buffer.from(plaintext, 'utf8')),
    );
  }

  async decrypt(label: string, envelope: string): Promise<string> {
    return (await this.open(label, envelope)).toString('utf8');
  }

  async encryptBuffer(label: string, data: Buffer): Promise<Buffer> {
    const dataKey = await this.kms.generateDataKey();
    return Buffer.from(this.seal(dataKey, label, data), 'utf8');
  }

  decryptBuffer(label: string, blob: Buffer): Promise<Buffer> {
    return this.open(label, blob.toString('utf8'));
  }

  static isEncryptedBuffer(blob: Buffer): boolean {
    return blob.subarray(0, PREFIX_BYTES.length).equals(PREFIX_BYTES);
  }

  private seal(dataKey: DataKey, label: string, data: Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', dataKey.plaintext, iv);
    cipher.setAAD(aadFor(label));
    const sealed = Buffer.concat([
      cipher.update(data),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
    const iv64 = iv.toString('base64url');
    const sealed64 = sealed.toString('base64url');
    return `${ENVELOPE_PREFIX}${dataKey.keyId}:${dataKey.wrapped}:${iv64}:${sealed64}`;
  }

  private async open(label: string, envelope: string): Promise<Buffer> {
    const match = ENVELOPE.exec(envelope);
    if (!match) throw new FieldDecryptionError(label);
    const [, keyId, wrapped, iv64, sealed64] = match;
    const dek = await this.unwrap(wrapped, keyId);
    const iv = Buffer.from(iv64, 'base64url');
    const sealed = Buffer.from(sealed64, 'base64url');
    try {
      const decipher = createDecipheriv('aes-256-gcm', dek, iv, {
        authTagLength: 16,
      });
      decipher.setAAD(aadFor(label));
      decipher.setAuthTag(sealed.subarray(-16));
      const enc = sealed.subarray(0, -16);
      return Buffer.concat([decipher.update(enc), decipher.final()]);
    } catch {
      throw new FieldDecryptionError(label);
    }
  }

  // Keyed on the key id too, so an envelope whose key id was edited fails the same way
  // whether or not this process has already opened the genuine one.
  private unwrap(wrapped: string, keyId: string): Promise<Buffer> {
    const cacheKey = `${keyId}:${wrapped}`;
    const cached = this.dekCache.get(cacheKey);
    if (cached) return cached;
    const pending = this.kms.decryptDataKey(wrapped, keyId);
    // A failed unwrap must not stick, or one transient KMS error would poison the row.
    pending.catch(() => this.dekCache.delete(cacheKey));
    if (this.dekCache.size >= DEK_CACHE_LIMIT) {
      const [oldest] = this.dekCache.keys();
      this.dekCache.delete(oldest);
    }
    this.dekCache.set(cacheKey, pending);
    return pending;
  }
}
