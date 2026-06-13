import { Injectable, Logger } from '@nestjs/common';
import { DnsVerificationService } from './dns-verification.service.js';

// Dev driver: orgs use demo domains nobody controls, so verification is bypassed
// (and logged). Switch DNS_DRIVER=real for genuine TXT-record checks.
@Injectable()
export class LocalDnsService extends DnsVerificationService {
  private readonly logger = new Logger('LocalDns');

  hasTxtRecord(domain: string, expectedRecord: string): Promise<boolean> {
    this.logger.warn(
      `DNS verification bypassed (dev) for ${domain} — expected TXT "${expectedRecord}"`,
    );
    return Promise.resolve(true);
  }
}
