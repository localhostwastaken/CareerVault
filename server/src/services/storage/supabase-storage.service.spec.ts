import { SupabaseStorageService } from './supabase-storage.service.js';

/**
 * In-memory fake of the Supabase Storage bucket surface (upload/download/remove), mirroring
 * the SDK's { data, error } contract. See supabase-kms.service.spec.ts for why the fake sits
 * at `.storage.from()` rather than mocking createClient itself.
 */
function fakeBucket(
  options: { failUpload?: boolean; failDownload?: boolean; failRemove?: boolean } = {},
) {
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
        if (options.failDownload) {
          return Promise.resolve({
            data: null,
            error: { message: 'simulated download failure' },
          });
        }
        const value = objects.get(path);
        if (!value) {
          return Promise.resolve({
            data: null,
            error: { message: 'Object not found' },
          });
        }
        return Promise.resolve({
          data: {
            arrayBuffer: () =>
              Promise.resolve(
                value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength),
              ),
          },
          error: null,
        });
      },
      remove: (paths: string[]) => {
        if (options.failRemove) {
          return Promise.resolve({
            data: null,
            error: { message: 'simulated remove failure' },
          });
        }
        for (const path of paths) objects.delete(path);
        return Promise.resolve({ data: null, error: null });
      },
    },
  };
}

function storageWith(fake: ReturnType<typeof fakeBucket>): SupabaseStorageService {
  const env: Record<string, string> = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    SUPABASE_STORAGE_BUCKET: 'careervault-storage',
  };
  const service = new SupabaseStorageService({
    get: (name: string) => env[name],
    getOrThrow: (name: string) => env[name],
  } as never);
  (service as unknown as { supabase: { storage: { from: () => unknown } } }).supabase = {
    storage: { from: () => fake.bucket },
  } as never;
  return service;
}

describe('SupabaseStorageService', () => {
  it('round-trips a put object through get with identical bytes', async () => {
    const fake = fakeBucket();
    const storage = storageWith(fake);
    const payload = Buffer.from('issued pdf bytes');

    await storage.put('doc-1.pdf', payload);
    const readBack = await storage.get('doc-1.pdf');

    expect(readBack).toEqual(payload);
  });

  it('deletes an object so a subsequent get fails', async () => {
    const fake = fakeBucket();
    const storage = storageWith(fake);
    await storage.put('doc-1.pdf', Buffer.from('x'));

    await storage.delete('doc-1.pdf');

    await expect(storage.get('doc-1.pdf')).rejects.toThrow(/missing/);
  });

  it('fails clearly on get for an object that was never written, rather than returning empty bytes', async () => {
    const storage = storageWith(fakeBucket());

    await expect(storage.get('never-written.pdf')).rejects.toThrow(
      /missing from Supabase Storage/,
    );
  });

  it('does not silently succeed when the SDK reports an upload failure', async () => {
    const storage = storageWith(fakeBucket({ failUpload: true }));

    await expect(storage.put('doc-1.pdf', Buffer.from('x'))).rejects.toThrow(
      /Failed to upload object/,
    );
  });

  it('does not silently succeed when the SDK reports a download failure', async () => {
    const fake = fakeBucket({ failDownload: true });
    const storage = storageWith(fake);
    fake.objects.set('objects/doc-1.pdf', Buffer.from('x'));

    await expect(storage.get('doc-1.pdf')).rejects.toThrow(
      /missing from Supabase Storage/,
    );
  });

  it('does not silently succeed when the SDK reports a remove failure', async () => {
    const storage = storageWith(fakeBucket({ failRemove: true }));
    await storage.put('doc-1.pdf', Buffer.from('x'));

    await expect(storage.delete('doc-1.pdf')).rejects.toThrow(
      /Failed to delete object/,
    );
  });

  it('getUrl returns the same placeholder shape the local driver uses, not a working signed URL', () => {
    const storage = storageWith(fakeBucket());

    expect(storage.getUrl('doc-1.pdf')).toBe('/api/v1/files/doc-1.pdf');
  });
});
