import { Injectable, Logger } from '@nestjs/common';
import { DnsVerificationService } from './dns-verification.service.js';

// Dev driver: orgs use demo domains nobody controls, so verification is bypassed
// (and logged). Switch DNS_DRIVER=real for genuine TXT-record checks.
@Injectable()
export class LocalDnsService extends DnsVerificationService {
  private readonly logger = new Logger('LocalDns');

  hasTxtRecord(domain: string, expectedRecord: string): Promise<boolean> {
    // Returns true for EVERY domain — no ownership is proven. Anyone can
    // "verify" any domain and have a signing key minted for it. Never run this
    // driver where issued documents are trusted; set DNS_DRIVER=real.
    this.logger.warn(
      `DNS verification BYPASSED (DNS_DRIVER=local) for "${domain}" — ` +
        `no ownership checked; expected TXT was "${expectedRecord}". ` +
        `Use DNS_DRIVER=real in any trusted environment.`,
    );
    return Promise.resolve(true);
  }
}
