import { resolveTxt } from 'node:dns/promises';
import { Injectable } from '@nestjs/common';
import { DnsVerificationService } from './dns-verification.service.js';

@Injectable()
export class RealDnsService extends DnsVerificationService {
  async hasTxtRecord(domain: string, expectedRecord: string): Promise<boolean> {
    try {
      const records = await resolveTxt(domain);
      return records.some((chunks) => chunks.join('').includes(expectedRecord));
    } catch {
      return false;
    }
  }
}
