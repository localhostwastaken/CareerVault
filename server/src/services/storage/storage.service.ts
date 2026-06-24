// Object storage abstraction (PDFs, assets). LocalDisk (dev) today, S3 later.
export interface StoredObject {
  key: string;
  url: string;
}

export abstract class StorageService {
  abstract put(
    key: string,
    data: Buffer,
    contentType?: string,
  ): Promise<StoredObject>;
  abstract get(key: string): Promise<Buffer>;
  abstract delete(key: string): Promise<void>;
  abstract getUrl(key: string): string;
}
