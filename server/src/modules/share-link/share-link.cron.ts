import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';

const ABANDON_TTL_MS = 86_400_000; // 24h

// Reclaims checkouts the user never completed: a never-paid, inactive link and its
// stranded PENDING payment. WORKER-gated; idempotent.
@Injectable()
export class ShareLinkCron {
  private readonly logger = new Logger(ShareLinkCron.name);
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>('WORKER') ?? false;
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async purgeAbandoned() {
    if (!this.enabled) return;
    const cutoff = new Date(Date.now() - ABANDON_TTL_MS);
    try {
      const links = await this.prisma.sharedLink.deleteMany({
        where: { isActive: false, isPaid: false, createdAt: { lt: cutoff } },
      });
      const payments = await this.prisma.payment.deleteMany({
        where: {
          type: 'ONE_TIME_LINK',
          status: 'PENDING',
          createdAt: { lt: cutoff },
        },
      });
      if (links.count || payments.count) {
        this.logger.log(
          `Purged ${links.count} abandoned link(s) and ${payments.count} pending payment(s)`,
        );
      }
    } catch (error) {
      this.logger.error(`Share-link purge failed: ${error}`);
    }
  }
}
