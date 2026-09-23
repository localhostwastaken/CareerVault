import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainService } from './blockchain.service.js';
import { LocalAnchorService } from './local-anchor.service.js';
import { PolygonAnchorService } from './polygon-anchor.service.js';

@Module({
  providers: [
    LocalAnchorService,
    {
      provide: BlockchainService,
      // PolygonAnchorService is built here rather than registered as a provider: its
      // settings only exist under the amoy driver. Nest still runs its onModuleInit.
      useFactory: (
        config: ConfigService,
        local: LocalAnchorService,
      ): BlockchainService => {
        const driver = config.get<string>('BLOCKCHAIN_DRIVER');
        if (driver === 'amoy') return new PolygonAnchorService(config);
        if (driver === 'local') return local;
        throw new Error(`BLOCKCHAIN_DRIVER="${driver}" not implemented`);
      },
      inject: [ConfigService, LocalAnchorService],
    },
  ],
  exports: [BlockchainService],
})
export class BlockchainModule {}
