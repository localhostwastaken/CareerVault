import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FieldCipher } from '../key-management/field-cipher.js';
import { KeyManagementModule } from '../key-management/key-management.module.js';
import { EncryptedStorageService } from './encrypted-storage.service.js';
import { LocalStorageService } from './local-storage.service.js';
import { StorageService } from './storage.service.js';
import { SupabaseStorageService } from './supabase-storage.service.js';

// Imported explicitly (rather than relied on via the @Global() ServicesModule that
// re-exports it) so FieldCipher's availability here doesn't depend on module load order.
@Module({
  imports: [KeyManagementModule],
  providers: [
    {
      provide: StorageService,
      // R10: every driver is wrapped in EncryptedStorageService, so whichever backend is selected here, objects hit disk as ciphertext. Callers only ever see StorageService. LocalStorageService/SupabaseStorageService are constructed here rather than listed as ordinary providers, since each driver's constructor requires only the env vars that driver needs (e.g. SupabaseStorageService requires SUPABASE_URL) — Nest would otherwise eagerly instantiate every listed provider regardless of which one is actually selected.
      useFactory: (
        config: ConfigService,
        cipher: FieldCipher,
      ): StorageService => {
        const driver = config.get<string>('STORAGE_DRIVER');
        if (driver === 'local')
          return new EncryptedStorageService(new LocalStorageService(config), cipher);
        if (driver === 'supabase')
          return new EncryptedStorageService(new SupabaseStorageService(config), cipher);
        throw new Error(
          `STORAGE_DRIVER="${driver}" not implemented (only "local", "supabase")`,
        );
      },
      inject: [ConfigService, FieldCipher],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
