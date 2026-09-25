import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FieldCipher } from '../services/key-management/field-cipher.js';
import { KeyManagementModule } from '../services/key-management/key-management.module.js';
import { fieldEncryption } from './encryption/field-encryption.extension.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  imports: [KeyManagementModule],
  providers: [
    {
      provide: PrismaService,
      inject: [ConfigService, FieldCipher],
      // A query extension adds no API surface, so every consumer still gets exactly the
      // PrismaService API. The extended client is no longer `instanceof PrismaService`,
      // though, so never test for that.
      useFactory: (config: ConfigService, cipher: FieldCipher) =>
        new PrismaService(config).$extends(
          fieldEncryption(cipher, {
            strict: config.get<boolean>('FIELD_ENCRYPTION_STRICT') ?? false,
          }),
        ) as unknown as PrismaService,
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
