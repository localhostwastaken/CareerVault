import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MerkleService } from './merkle.service.js';

// Scheduled anchoring. Gated by WORKER so only the worker process runs it; the batch
// itself is idempotent, so a duplicate run is harmless.
@Injectable()
export class MerkleCron {
  private readonly logger = new Logger(MerkleCron.name);
  private readonly enabled: boolean;

  constructor(
    private readonly merkle: MerkleService,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>('WORKER') ?? false;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async anchorDaily() {
    if (!this.enabled) return;
    try {
      await this.merkle.runBatch();
    } catch (error) {
      this.logger.error(`Merkle cron failed: ${error}`);
    }
  }
}
