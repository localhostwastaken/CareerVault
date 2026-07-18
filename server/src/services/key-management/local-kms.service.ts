import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign as cryptoSign,
  verify as cryptoVerify,
} from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KeyManagementService, OrgKeyPair } from './key-management.service.js';

// Real RSA-2048 / RS256 signing with per-org key pairs persisted to disk. Private
// keys are wrapped with AES-256-GCM under a master key (envelope encryption), so
// the architecture mirrors AWS KMS and swaps to AwsKmsService without caller changes.
@Injectable()
export class LocalKmsService extends KeyManagementService {
  private readonly logger = new Logger(LocalKmsService.name);
  private readonly keysDir: string;
  private readonly masterKey: Buffer;

  constructor(config: ConfigService) {
    super();
    this.keysDir = join(
      config.get<string>('STORAGE_LOCAL_DIR') ?? './storage',
      'kms',
    );
    this.masterKey = this.resolveMasterKey(
      config.get<string>('KMS_MASTER_KEY'),
    );
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

  private async loadPrivateKey(kmsKeyId: string): Promise<string> {
    const blob = Buffer.from(
      await readFile(this.fileFor(kmsKeyId), 'utf8'),
      'base64',
    );
    const iv = blob.subarray(0, 12);
    const tag = blob.subarray(12, 28);
    const enc = blob.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
      'utf8',
    );
  }

  private fileFor(kmsKeyId: string): string {
    return join(
      this.keysDir,
      `${createHash('sha256').update(kmsKeyId).digest('hex')}.key`,
    );
  }

  // Use KMS_MASTER_KEY if set; otherwise persist a generated dev key so signatures survive restarts.
  // AES-256-GCM requires exactly 32 bytes; fail fast with clear error if misconfigured.
  private resolveMasterKey(envKey?: string): Buffer {
    // Try env var first (preferred for production).
    if (envKey && envKey.trim()) {
      const key = Buffer.from(envKey, 'base64');
      if (key.length !== 32)
        throw new Error(
          `KMS_MASTER_KEY must decode to exactly 32 bytes (256 bits); got ${key.length}. ` +
          `Generate with: openssl rand -base64 32`,
        );
      return key;
    }

    // Fall back to file-based key (dev).
    const file = join(this.keysDir, 'master.key');
    if (existsSync(file)) {
      const key = Buffer.from(readFileSync(file, 'utf8'), 'base64');
      if (key.length !== 32) {
        this.logger.error(
          `Corrupted master key file (${key.length} bytes, expected 32). Regenerating.`,
        );
        // Regenerate if file is corrupted.
        const newKey = randomBytes(32);
        writeFileSync(file, newKey.toString('base64'), {
          encoding: 'utf8',
          mode: 0o600,
        });
        return newKey;
      }
      return key;
    }

    // Generate new key if no env var and no file.
    const key = randomBytes(32);
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    writeFileSync(file, key.toString('base64'), {
      encoding: 'utf8',
      mode: 0o600,
    });
    this.logger.warn(
      `KMS_MASTER_KEY not set — generated a dev master key at ${file}`,
    );
    return key;
  }
}
