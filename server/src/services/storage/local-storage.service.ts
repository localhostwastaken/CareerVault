import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService, StoredObject } from './storage.service.js';

// Stores objects under STORAGE_LOCAL_DIR/objects/<key>. URLs point at the (future)
// files endpoint; swap to S3 + pre-signed URLs without caller changes.
@Injectable()
export class LocalStorageService extends StorageService {
  private readonly dir: string;

  constructor(config: ConfigService) {
    super();
    this.dir = join(
      config.get<string>('STORAGE_LOCAL_DIR') ?? './storage',
      'objects',
    );
  }

  async put(key: string, data: Buffer): Promise<StoredObject> {
    const file = join(this.dir, key);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
    return { key, url: this.getUrl(key) };
  }

  async get(key: string): Promise<Buffer> {
    return readFile(join(this.dir, key));
  }

  async delete(key: string): Promise<void> {
    await rm(join(this.dir, key), { force: true });
  }

  getUrl(key: string): string {
    return `/api/v1/files/${key}`;
  }
}
