import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FieldCipher } from './field-cipher.js';
import { KeyManagementService } from './key-management.service.js';
import { LocalKmsService } from './local-kms.service.js';
import { SupabaseKmsService } from './supabase-kms.service.js';

@Module({
  providers: [
    {
      provide: KeyManagementService,
      // LocalKmsService/SupabaseKmsService are constructed here, not listed as ordinary providers — each driver's constructor requires env vars only that driver needs (e.g. SupabaseKmsService requires SUPABASE_URL), and Nest eagerly instantiates every provider in a module's list regardless of which one a factory picks. Only build the one the selected driver actually needs.
      useFactory: (config: ConfigService): KeyManagementService => {
        const driver = config.get<string>('KEY_MANAGEMENT_DRIVER');
        if (driver === 'local') return new LocalKmsService(config);
        if (driver === 'supabase') return new SupabaseKmsService(config);
        throw new Error(
          `KEY_MANAGEMENT_DRIVER="${driver}" not implemented (only "local", "supabase")`,
        );
      },
      inject: [ConfigService],
    },
    FieldCipher,
  ],
  exports: [KeyManagementService, FieldCipher],
})
export class KeyManagementModule {}
