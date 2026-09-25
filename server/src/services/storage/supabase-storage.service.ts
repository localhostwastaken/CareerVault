import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageService, StoredObject } from './storage.service.js';

// Stores objects under a private Supabase Storage bucket instead of STORAGE_LOCAL_DIR/objects. Exists because Render's free tier has no persistent disk, so local files are wiped on every redeploy. `EncryptedStorageService` wraps this driver exactly like it wraps LocalStorageService (see that file), so every object this puts to Supabase is already ciphertext — nothing here is aware of, or changes, that encryption.

// getUrl() is not currently used as a real, dereferenced link anywhere in this codebase — every caller (document.controller.ts, pdf-generation.service.ts) calls get()/put() directly and streams the buffer through the API response. This returns the same placeholder path LocalStorageService does for consistency; it is not a working signed URL.
@Injectable()
export class SupabaseStorageService extends StorageService {
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    super();
    this.supabase = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
    this.bucket = config.get<string>('SUPABASE_STORAGE_BUCKET') ?? 'careervault-storage';
  }

  async put(
    key: string,
    data: Buffer,
    contentType?: string,
  ): Promise<StoredObject> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(this.pathFor(key), data, {
        contentType: contentType ?? 'application/octet-stream',
        upsert: true,
      });
    if (error) {
      throw new Error(
        `Failed to upload object "${key}" to Supabase Storage: ${error.message}`,
      );
    }
    return { key, url: this.getUrl(key) };
  }

  async get(key: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(this.pathFor(key));
    if (error || !data) {
      throw new Error(
        `Object "${key}" is missing from Supabase Storage: ${error?.message ?? 'no data returned'}`,
      );
    }
    return Buffer.from(await data.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([this.pathFor(key)]);
    if (error) {
      throw new Error(
        `Failed to delete object "${key}" from Supabase Storage: ${error.message}`,
      );
    }
  }

  getUrl(key: string): string {
    return `/api/v1/files/${key}`;
  }

  private pathFor(key: string): string {
    return `objects/${key}`;
  }
}
