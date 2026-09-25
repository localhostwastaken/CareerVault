import { randomBytes } from 'node:crypto';
import {
  DataKeyUnavailableError,
  SigningKeyUnavailableError,
} from './key-management.service.js';
import { SupabaseKmsService } from './supabase-kms.service.js';

const HASH = 'ab'.repeat(32);

// In-memory fake of the Supabase Storage bucket surface this service uses (upload/download/list), mirroring the SDK's { data, error } contract instead of throwing, since createClient() itself is never mocked — the service is given a fake ConfigService and its real `createClient(...)` call is redirected by overriding the module-level `supabase` field after construction is not possible (private), so instead we point SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY at values that make createClient() build a harmless client, and monkey-patch its `.storage.from` via a lightweight fake bucket object handed back by a stubbed `from()`.
function fakeBucket(options: { failList?: boolean; failUpload?: boolean } = {}) {
  const objects = new Map<string, Buffer>();

  return {
    objects,
    bucket: {
      upload: (path: string, data: Buffer) => {
        if (options.failUpload) {
          return Promise.resolve({
            data: null,
            error: { message: 'simulated upload failure' },
          });
        }
        objects.set(path, Buffer.from(data));
        return Promise.resolve({ data: { path }, error: null });
      },
      download: (path: string) => {
        const value = objects.get(path);
        if (!value) {
          return Promise.resolve({
            data: null,
            error: { message: 'Object not found' },
          });
        }
        return Promise.resolve({
          data: { arrayBuffer: () => Promise.resolve(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)) },
          error: null,
        });
      },
      list: (dir: string, opts: { search: string }) => {
        if (options.failList) {
          return Promise.resolve({
            data: null,
            error: { message: 'simulated auth failure' },
          });
        }
        const names = [...objects.keys()]
          .filter((p) => p.startsWith(`${dir}/`))
          .map((p) => p.slice(dir.length + 1));
        return Promise.resolve({
          data: names
            .filter((name) => name === opts.search)
            .map((name) => ({ name })),
          error: null,
        });
      },
      remove: () => Promise.resolve({ data: null, error: null }),
    },
  };
}

function kmsWith(masterKey: Buffer, fake: ReturnType<typeof fakeBucket>) {
  const env: Record<string, string> = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    SUPABASE_STORAGE_BUCKET: 'careervault-storage',
    KMS_MASTER_KEY: masterKey.toString('base64'),
  };
  const service = new SupabaseKmsService({
    get: (name: string) => env[name],
    getOrThrow: (name: string) => env[name],
  } as never);
  // Replace the real Supabase client's storage accessor with the fake bucket, the same way other specs in this codebase substitute a hand-rolled object for a real dependency.
  (service as unknown as { supabase: { storage: { from: () => unknown } } }).supabase = {
    storage: { from: () => fake.bucket },
  } as never;
  return service;
}

describe('SupabaseKmsService', () => {
  describe('org signing keys (R3)', () => {
    it('persists and signs with a freshly generated org key (round-trip through upload/download)', async () => {
      const fake = fakeBucket();
      const kms = kmsWith(randomBytes(32), fake);

      const { kmsKeyId, publicKeyPem } = await kms.generateOrgKeyPair('org-1');
      const signature = await kms.sign(kmsKeyId, HASH);

      await expect(kms.verify(publicKeyPem, HASH, signature)).resolves.toBe(
        true,
      );
      expect(fake.objects.size).toBe(1);
    });

    it('reports hasKey=true for a persisted key and false for an absent one', async () => {
      const fake = fakeBucket();
      const kms = kmsWith(randomBytes(32), fake);
      const { kmsKeyId } = await kms.generateOrgKeyPair('org-1');

      await expect(kms.hasKey(kmsKeyId)).resolves.toBe(true);
      await expect(kms.hasKey('supabase-kms:org-2:deadbeefdeadbeef')).resolves.toBe(
        false,
      );
    });

    it('raises SigningKeyUnavailableError, not a raw SDK error, for a missing key object', async () => {
      const fake = fakeBucket();
      const kms = kmsWith(randomBytes(32), fake);

      await expect(
        kms.sign('supabase-kms:never-onboarded:aaaa', HASH),
      ).rejects.toBeInstanceOf(SigningKeyUnavailableError);
    });

    it('raises SigningKeyUnavailableError when the stored key was wrapped under a different master key', async () => {
      const fake = fakeBucket();
      const kms1 = kmsWith(randomBytes(32), fake);
      const { kmsKeyId } = await kms1.generateOrgKeyPair('org-1');
      const kms2 = kmsWith(randomBytes(32), fake); // different master key, same bucket

      await expect(kms2.sign(kmsKeyId, HASH)).rejects.toBeInstanceOf(
        SigningKeyUnavailableError,
      );
    });

    it('propagates (rather than swallows into false) a hasKey check that fails for a reason other than absence', async () => {
      const fake = fakeBucket({ failList: true });
      const kms = kmsWith(randomBytes(32), fake);

      await expect(kms.hasKey('supabase-kms:org-1:aaaa')).rejects.toThrow(
        /Could not check Supabase Storage/,
      );
    });

    it('does not silently succeed when persisting a key fails at the SDK level', async () => {
      const fake = fakeBucket({ failUpload: true });
      const kms = kmsWith(randomBytes(32), fake);

      await expect(kms.generateOrgKeyPair('org-1')).rejects.toThrow(
        /Failed to persist signing key to Supabase Storage/,
      );
    });
  });

  describe('data keys (R10) — unaffected by the storage transport', () => {
    it('round-trips a 32-byte data key through wrap and unwrap', async () => {
      const fake = fakeBucket();
      const kms = kmsWith(randomBytes(32), fake);

      const dataKey = await kms.generateDataKey();

      expect(dataKey.plaintext).toHaveLength(32);
      await expect(
        kms.decryptDataKey(dataKey.wrapped, dataKey.keyId),
      ).resolves.toEqual(dataKey.plaintext);
    });

    it('rejects a data key wrapped under a different master key', async () => {
      const fake = fakeBucket();
      const dataKey = await kmsWith(randomBytes(32), fake).generateDataKey();
      const other = kmsWith(randomBytes(32), fake);

      await expect(
        other.decryptDataKey(dataKey.wrapped, dataKey.keyId),
      ).rejects.toBeInstanceOf(DataKeyUnavailableError);
    });
  });
});
