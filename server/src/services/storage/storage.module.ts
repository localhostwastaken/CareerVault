import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FieldCipher } from '../key-management/field-cipher.js';
import { KeyManagementModule } from '../key-management/key-management.module.js';
import { EncryptedStorageService } from './encrypted-storage.service.js';
import { LocalStorageService } from './local-storage.service.js';
import { StorageService } from './storage.service.js';

// Imported explicitly (rather than relied on via the @Global() ServicesModule that
// re-exports it) so FieldCipher's availability here doesn't depend on module load order.
@Module({
  imports: [KeyManagementModule],
  providers: [
    LocalStorageService,
    {
      provide: StorageService,
      // R10: every driver is wrapped in EncryptedStorageService, so whichever backend is
      // selected here, objects hit disk as ciphertext. Callers only ever see StorageService.
      useFactory: (
        config: ConfigService,
        local: LocalStorageService,
        cipher: FieldCipher,
      ): StorageService => {
        const driver = config.get<string>('STORAGE_DRIVER');
        if (driver !== 'local') {
          throw new Error(
            `STORAGE_DRIVER="${driver}" not implemented (only "local")`,
          );
        }
        return new EncryptedStorageService(local, cipher);
      },
      inject: [ConfigService, LocalStorageService, FieldCipher],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
