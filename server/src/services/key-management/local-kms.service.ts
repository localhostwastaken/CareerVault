import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
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
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

// Real RSA-2048 / RS256 signing (R3) with per-org key pairs persisted to disk. Private
// keys are wrapped with AES-256-GCM under a master key (envelope encryption), so
// the architecture mirrors AWS KMS and swaps to AwsKmsService without caller changes.
// R10 data keys wrap under an HKDF-derived KEK so no one key serves both purposes.
@Injectable()
export class LocalKmsService extends KeyManagementService {
  private readonly logger = new Logger(LocalKmsService.name);
  private readonly keysDir: string;
  private readonly masterKey: Buffer;
  private readonly fieldKek: Buffer;
  private readonly fieldKeyId: string;

  constructor(config: ConfigService) {
    super();
    this.keysDir = join(
      config.get<string>('STORAGE_LOCAL_DIR') ?? './storage',
      'kms',
    );
    this.masterKey = loadMasterKey(
      config.get<string>('KMS_MASTER_KEY'),
      this.keysDir,
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
    const kmsKeyId = `local-kms:${orgId}:${fingerprint}`;
    await this.persistPrivateKey(kmsKeyId, privPem);
    return { kmsKeyId, publicKeyPem };
  }

  async hasKey(kmsKeyId: string): Promise<boolean> {
    try {
      await access(this.fileFor(kmsKeyId));
      return true;
    } catch {
      return false;
    }
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
    const file = this.fileFor(kmsKeyId);
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    await writeFile(file, Buffer.concat([iv, tag, enc]).toString('base64'), {
      encoding: 'utf8',
      mode: 0o600,
    });
  }

  // Both failure modes here mean the same operational thing — the key store did not
  // survive — and both used to escape as a raw Node error that the global exception filter
  // flattened into "Internal server error", leaving no trace of the actual cause for the
  // person who just failed to sign a document.
  private async loadPrivateKey(kmsKeyId: string): Promise<string> {
    const file = this.fileFor(kmsKeyId);
    let raw: string;
    try {
      raw = await readFile(file, 'utf8');
    } catch (error) {
      throw new SigningKeyUnavailableError(
        kmsKeyId,
        `key file is missing at ${file} — the key store was not persisted across a restart`,
        error,
      );
    }
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
    } catch (error) {
      throw new SigningKeyUnavailableError(
        kmsKeyId,
        `key file at ${file} could not be decrypted — KMS_MASTER_KEY does not match the one that wrapped it`,
        error,
      );
    }
  }

  private fileFor(kmsKeyId: string): string {
    return join(
      this.keysDir,
      `${createHash('sha256').update(kmsKeyId).digest('hex')}.key`,
    );
  }
}
