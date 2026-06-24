import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DnsVerificationService } from './dns-verification.service.js';
import { LocalDnsService } from './local-dns.service.js';
import { RealDnsService } from './real-dns.service.js';

@Module({
  providers: [
    LocalDnsService,
    RealDnsService,
    {
      provide: DnsVerificationService,
      useFactory: (
        config: ConfigService,
        local: LocalDnsService,
        real: RealDnsService,
      ): DnsVerificationService =>
        config.get<string>('DNS_DRIVER') === 'real' ? real : local,
      inject: [ConfigService, LocalDnsService, RealDnsService],
    },
  ],
  exports: [DnsVerificationService],
})
export class DnsModule {}
