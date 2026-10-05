import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { SystemStatusService } from './system-status.service.js';

// BlockchainService is injected from the @Global ServicesModule like every feature module
// does, so the app keeps one anchor adapter: one wallet, one nonce queue, one self-check.
@Module({
  controllers: [HealthController],
  providers: [SystemStatusService],
})
export class HealthModule {}
