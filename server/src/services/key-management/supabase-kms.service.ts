import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign as cryptoSign,
  verify as cryptoVerify,
} from 'node:crypto';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DataKey,
  DataKeyUnavailableError,
  KeyManagementService,
  OrgKeyPair,
  SigningKeyUnavailableError,
} from './key-management.service.js';
import { loadMasterKey } from './master-key.js';

const FIELD_KEK_INFO = 'careervault/field-kek/v1';
const DEK_AAD = Buffer.from('careervault|dek|v1', 'utf8');

// Same custodial signing (R3) and R10 field-encryption-key scheme as LocalKmsService, with one difference: per-org private key files live in a private Supabase Storage bucket instead of STORAGE_LOCAL_DIR. This exists because Render's free tier has no persistent disk, so STORAGE_LOCAL_DIR is wiped on every redeploy under the "local" driver — see docs on this incident. The private key is always AES-256-GCM ciphertext under KMS_MASTER_KEY before it leaves this process (persistPrivateKey below), so the bucket only ever holds an opaque encrypted blob: this is a storage-transport swap, not a change to the key-custody threat model. KMS_MASTER_KEY itself stays a Render env var / process secret, unaffected by this driver (loadMasterKey is unchanged).
@Injectable()
export class SupabaseKmsService extends KeyManagementService {
  private readonly logger = new Logger(SupabaseKmsService.name);
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;
  private readonly masterKey: Buffer;
  private readonly fieldKek: Buffer;
  private readonly fieldKeyId: string;

  constructor(config: ConfigService) {
    super();
    this.supabase = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
    this.bucket = config.get<string>('SUPABASE_STORAGE_BUCKET') ?? 'careervault-storage';
    // The master key is unrelated to which storage driver is selected — it stays an env var (or, in a from-scratch dev environment with no persistent disk at all, this dev-only file fallback would itself need STORAGE_LOCAL_DIR to be durable; that's an orthogonal concern documented on loadMasterKey/master-key.ts, not something this driver changes).
    // Must match LocalKmsService's keysDir exactly (STORAGE_LOCAL_DIR/kms), not just STORAGE_LOCAL_DIR — otherwise the dev-fallback master.key file lands in a different directory per driver, silently producing two different master keys from one env, and every row encrypted under one driver becomes unreadable under the other.
    this.masterKey = loadMasterKey(
      config.get<string>('KMS_MASTER_KEY'),
      join(config.get<string>('STORAGE_LOCAL_DIR') ?? './storage', 'kms'),
      this.logger,
    );
    this.fieldKek = Buffer.from(
      hkdfSync('sha256', this.masterKey, Buffer.alloc(0), FIELD_KEK_INFO, 32),
    );
    const kekHash = createHash('sha256').update(this.fieldKek).digest('hex');
    this.fieldKeyId = kekHash.slice(0, 16);
  }

  async generateOrgKeyPair(orgId: string): Promise<OrgKeyPair> {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const privPem = privateKey
      .export({ type: 'pkcs8', format: 'pem' })
      .toString();
    const publicKeyPem = publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString();
    const fingerprint = createHash('sha256')
      .update(publicKeyPem)
      .digest('hex')
      .slice(0, 16);
    const kmsKeyId = `supabase-kms:${orgId}:${fingerprint}`;
    await this.persistPrivateKey(kmsKeyId, privPem);
    return { kmsKeyId, publicKeyPem };
  }

  async hasKey(kmsKeyId: string): Promise<boolean> {
    const path = this.pathFor(kmsKeyId);
    const dir = path.slice(0, path.lastIndexOf('/'));
    const filename = path.slice(path.lastIndexOf('/') + 1);
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list(dir, { search: filename });
    if (error) {
      // Distinguish "confirmed absent" from "couldn't check" — an auth/network failure here
      // must not silently read as "this org was never onboarded."
      throw new Error(
        `Could not check Supabase Storage for signing key "${kmsKeyId}": ${error.message}`,
      );
    }
    return (data ?? []).some((entry) => entry.name === filename);
  }

  async sign(kmsKeyId: string, documentHashHex: string): Promise<string> {
    const privPem = await this.loadPrivateKey(kmsKeyId);
    // Sign the raw hash bytes, not the hex-encoded string (standard RS256).
    const signature = cryptoSign(
      'sha256',
      Buffer.from(documentHashHex, 'hex'),
      createPrivateKey(privPem),
    );
    return signature.toString('base64');
  }

  verify(
    publicKeyPem: string,
    documentHashHex: string,
    signatureB64: string,
  ): Promise<boolean> {
    return Promise.resolve(
      cryptoVerify(
        'sha256',
        Buffer.from(documentHashHex, 'hex'),
        createPublicKey(publicKeyPem),
        Buffer.from(signatureB64, 'base64'),
      ),
    );
  }

  generateDataKey(): Promise<DataKey> {
    const plaintext = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.fieldKek, iv);
    cipher.setAAD(DEK_AAD);
    const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const blob = Buffer.concat([iv, enc, cipher.getAuthTag()]);
    const wrapped = blob.toString('base64url');
    return Promise.resolve({ plaintext, wrapped, keyId: this.fieldKeyId });
  }

  decryptDataKey(wrapped: string, keyId: string): Promise<Buffer> {
    const fail = (detail: string, cause?: unknown) =>
      Promise.reject(
        new DataKeyUnavailableError(keyId, this.fieldKeyId, detail, cause),
      );
    if (keyId !== this.fieldKeyId)
      return fail(
        `data key was wrapped under key ${keyId} but KMS_MASTER_KEY yields key ${this.fieldKeyId} — the deployment is using a different master key`,
      );
    const blob = Buffer.from(wrapped, 'base64url');
    const iv = blob.subarray(0, 12);
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.fieldKek, iv, {
        authTagLength: 16,
      });
      decipher.setAAD(DEK_AAD);
      decipher.setAuthTag(blob.subarray(-16));
      const enc = blob.subarray(12, -16);
      return Promise.resolve(
        Buffer.concat([decipher.update(enc), decipher.final()]),
      );
    } catch (error) {
      return fail(`data key failed authentication under key ${keyId}`, error);
    }
  }

  private async persistPrivateKey(
    kmsKeyId: string,
    privPem: string,
  ): Promise<void> {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.masterKey, iv);
    const enc = Buffer.concat([cipher.update(privPem, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const blob = Buffer.concat([iv, tag, enc]).toString('base64');
    const path = this.pathFor(kmsKeyId);
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, Buffer.from(blob, 'utf8'), {
        contentType: 'text/plain',
        upsert: true,
      });
    if (error) {
      // Never include the ciphertext, the service-role key, or any secret material in this message or any log line — only the operation and the SDK's own reason.
      throw new Error(
        `Failed to persist signing key to Supabase Storage: ${error.message}`,
      );
    }
  }

  // Both failure modes here mean the same operational thing — the key store did not survive, or this deployment's master key can't open what's there — and both used to escape as a raw error that the global exception filter flattened into "Internal server error", leaving no trace of the actual cause for the person who just failed to sign a document.
  private async loadPrivateKey(kmsKeyId: string): Promise<string> {
    const path = this.pathFor(kmsKeyId);
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(path);
    if (error || !data) {
      throw new SigningKeyUnavailableError(
        kmsKeyId,
        `key object is missing at ${this.bucket}/${path} — the key store was not persisted across a restart`,
        error,
      );
    }
    const raw = Buffer.from(await data.arrayBuffer()).toString('utf8');
    const blob = Buffer.from(raw, 'base64');
    const iv = blob.subarray(0, 12);
    const tag = blob.subarray(12, 28);
    const enc = blob.subarray(28);
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.masterKey, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
        'utf8',
      );
    } catch (decryptError) {
      throw new SigningKeyUnavailableError(
        kmsKeyId,
        `key object at ${this.bucket}/${path} could not be decrypted — KMS_MASTER_KEY does not match the one that wrapped it`,
        decryptError,
      );
    }
  }

  private pathFor(kmsKeyId: string): string {
    return `kms/${createHash('sha256').update(kmsKeyId).digest('hex')}.key`;
  }
}
