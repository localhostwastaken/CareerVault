import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainService } from './blockchain.service.js';
import { LocalAnchorService } from './local-anchor.service.js';

@Module({
  providers: [
    LocalAnchorService,
    {
      provide: BlockchainService,
      useFactory: (
        config: ConfigService,
        local: LocalAnchorService,
      ): BlockchainService => {
        const driver = config.get<string>('BLOCKCHAIN_DRIVER');
        if (driver === 'local') return local;
        throw new Error(
          `BLOCKCHAIN_DRIVER="${driver}" not implemented (only "local")`,
        );
      },
      inject: [ConfigService, LocalAnchorService],
    },
  ],
  exports: [BlockchainService],
})
export class BlockchainModule {}
