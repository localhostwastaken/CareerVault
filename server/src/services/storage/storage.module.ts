import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service.js';
import { StorageService } from './storage.service.js';

@Module({
  providers: [
    LocalStorageService,
    {
      provide: StorageService,
      useFactory: (
        config: ConfigService,
        local: LocalStorageService,
      ): StorageService => {
        const driver = config.get<string>('STORAGE_DRIVER');
        if (driver === 'local') return local;
        throw new Error(
          `STORAGE_DRIVER="${driver}" not implemented (only "local")`,
        );
      },
      inject: [ConfigService, LocalStorageService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
