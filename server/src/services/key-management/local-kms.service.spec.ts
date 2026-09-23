import {
  createCipheriv,
  createHash,
  generateKeyPairSync,
  randomBytes,
} from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DataKeyUnavailableError } from './key-management.service.js';
import { LocalKmsService } from './local-kms.service.js';

const HASH = 'ab'.repeat(32);

describe('LocalKmsService', () => {
  let dir: string;

  const kmsWith = (masterKey: Buffer): LocalKmsService => {
    const env: Record<string, string> = {
      STORAGE_LOCAL_DIR: dir,
      KMS_MASTER_KEY: masterKey.toString('base64'),
    };
    return new LocalKmsService({ get: (name: string) => env[name] } as never);
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cv-local-kms-'));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  describe('data keys (R10)', () => {
    it('round-trips a 32-byte data key through wrap and unwrap', async () => {
      const kms = kmsWith(randomBytes(32));

      const dataKey = await kms.generateDataKey();

      expect(dataKey.plaintext).toHaveLength(32);
      expect(dataKey.wrapped).toMatch(/^[A-Za-z0-9_-]+$/);
      await expect(
        kms.decryptDataKey(dataKey.wrapped, dataKey.keyId),
      ).resolves.toEqual(dataKey.plaintext);
    });

    it('derives a 16-hex keyId that is stable for the same master key', async () => {
      const masterKey = randomBytes(32);

      const first = await kmsWith(masterKey).generateDataKey();
      const second = await kmsWith(masterKey).generateDataKey();

      expect(first.keyId).toMatch(/^[0-9a-f]{16}$/);
      expect(second.keyId).toBe(first.keyId);
      expect(second.plaintext).not.toEqual(first.plaintext);
    });

    it('names both key ids when a data key reaches a deployment with another master key', async () => {
      const dataKey = await kmsWith(randomBytes(32)).generateDataKey();
      const other = kmsWith(randomBytes(32));
      const ownId = (await other.generateDataKey()).keyId;

      const error = await other
        .decryptDataKey(dataKey.wrapped, dataKey.keyId)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DataKeyUnavailableError);
      expect(error).toMatchObject({
        keyId: dataKey.keyId,
        expectedKeyId: ownId,
      });
      expect((error as Error).message).toContain(dataKey.keyId);
      expect((error as Error).message).toContain(ownId);
    });

    it('rejects a tampered wrapped data key', async () => {
      const kms = kmsWith(randomBytes(32));
      const { wrapped, keyId } = await kms.generateDataKey();
      const blob = Buffer.from(wrapped, 'base64url');
      blob[20] ^= 0x01;

      await expect(
        kms.decryptDataKey(blob.toString('base64url'), keyId),
      ).rejects.toBeInstanceOf(DataKeyUnavailableError);
    });
  });

  describe('org signing keys (R3)', () => {
    it('still signs and verifies with a freshly generated org key', async () => {
      const kms = kmsWith(randomBytes(32));
      const { kmsKeyId, publicKeyPem } = await kms.generateOrgKeyPair('org-1');

      const signature = await kms.sign(kmsKeyId, HASH);

      await expect(kms.verify(publicKeyPem, HASH, signature)).resolves.toBe(
        true,
      );
    });

    // Deployed key stores hold files in this exact layout — base64(iv ‖ tag ‖ ciphertext)
    // under the raw master key — so R10 must not move signing keys onto the derived KEK.
    it('signs with an org key file written in the pre-R10 layout', async () => {
      const masterKey = randomBytes(32);
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });
      const kmsKeyId = 'local-kms:legacy-org:0123456789abcdef';
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', masterKey, iv);
      const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
      const enc = Buffer.concat([cipher.update(pem), cipher.final()]);
      const fileName = createHash('sha256').update(kmsKeyId).digest('hex');
      mkdirSync(join(dir, 'kms'));
      writeFileSync(
        join(dir, 'kms', `${fileName}.key`),
        Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64'),
      );
      const kms = kmsWith(masterKey);

      const signature = await kms.sign(kmsKeyId, HASH);

      const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
      await expect(
        kms.verify(publicKeyPem.toString(), HASH, signature),
      ).resolves.toBe(true);
    });
  });
});
