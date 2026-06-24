// Domain-ownership check abstraction. LocalDns (dev bypass) today, RealDns (dns.resolveTxt) later.
export abstract class DnsVerificationService {
  abstract hasTxtRecord(
    domain: string,
    expectedRecord: string,
  ): Promise<boolean>;
}
