import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KeyManagementService } from './key-management.service.js';
import { LocalKmsService } from './local-kms.service.js';

@Module({
  providers: [
    LocalKmsService,
    {
      provide: KeyManagementService,
      useFactory: (
        config: ConfigService,
        local: LocalKmsService,
      ): KeyManagementService => {
        const driver = config.get<string>('KEY_MANAGEMENT_DRIVER');
        if (driver === 'local') return local;
        throw new Error(
          `KEY_MANAGEMENT_DRIVER="${driver}" not implemented (only "local")`,
        );
      },
      inject: [ConfigService, LocalKmsService],
    },
  ],
  exports: [KeyManagementService],
})
export class KeyManagementModule {}
