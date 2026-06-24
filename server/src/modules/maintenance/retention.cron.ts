import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';

const DAY_MS = 86_400_000;
const STANDARD_AUDIT_RETENTION_DAYS = 90;

// Data-lifecycle housekeeping (R: retention/GDPR). WORKER-gated; every step is
// idempotent and independently guarded so one failure can't abort the rest.
@Injectable()
export class RetentionCron {
  private readonly logger = new Logger(RetentionCron.name);
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>('WORKER') ?? false;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runDaily() {
    if (!this.enabled) return;
    await this.expireDocuments().catch((e) =>
      this.logger.error(`expireDocuments: ${e}`),
    );
    await this.cleanupMagicLinks().catch((e) =>
      this.logger.error(`cleanupMagicLinks: ${e}`),
    );
    await this.cleanupRefreshTokens().catch((e) =>
      this.logger.error(`cleanupRefreshTokens: ${e}`),
    );
    await this.purgeAuditLogs().catch((e) =>
      this.logger.error(`purgeAuditLogs: ${e}`),
    );
  }

  // Flip issued documents past their validity window to EXPIRED so list/state views are
  // consistent (verification already treats an expired doc as EXPIRED dynamically).
  private async expireDocuments() {
    const result = await this.prisma.document.updateMany({
      where: {
        status: { in: ['ISSUED', 'ANCHORED'] },
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
    if (result.count) this.logger.log(`Expired ${result.count} document(s)`);
  }

  // Magic links are single-use and short-lived; drop used/expired ones after a grace day.
  private async cleanupMagicLinks() {
    const cutoff = new Date(Date.now() - DAY_MS);
    const result = await this.prisma.magicLink.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
      },
    });
    if (result.count) this.logger.log(`Purged ${result.count} magic link(s)`);
  }

  private async cleanupRefreshTokens() {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [{ revokedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
      },
    });
    if (result.count)
      this.logger.log(`Purged ${result.count} refresh token(s)`);
  }

  // STANDARD-tier audit entries are dropped after 90 days; COMPLIANCE is retained.
  private async purgeAuditLogs() {
    const cutoff = new Date(
      Date.now() - STANDARD_AUDIT_RETENTION_DAYS * DAY_MS,
    );
    const result = await this.prisma.auditLog.deleteMany({
      where: { retentionTier: 'STANDARD', createdAt: { lt: cutoff } },
    });
    if (result.count) this.logger.log(`Purged ${result.count} audit log(s)`);
  }
}
