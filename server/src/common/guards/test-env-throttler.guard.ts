import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Rate limiting is deliberately tight — registration is 5/min per IP, magic links are
// 5/hour per address — which is correct for real traffic and impossible for an end-to-end
// suite that creates a handful of accounts per run and reruns on demand.
//
// The bypass is bound to NODE_ENV === 'test' and nothing else. That value is constrained by
// the Joi env schema to development | test | production, so it cannot be reached by a
// stray header or query parameter, and production keeps the real guard. It is announced at
// construction so a misconfigured deploy is visible in the very first log lines.
@Injectable()
export class TestEnvThrottlerGuard extends ThrottlerGuard {
  private static readonly logger = new Logger('Throttler');
  private readonly disabled = process.env.NODE_ENV === 'test';

  override shouldSkip(): Promise<boolean> {
    if (this.disabled) {
      TestEnvThrottlerGuard.logger.warn(
        'NODE_ENV=test — rate limiting is DISABLED for this process.',
      );
    }
    return Promise.resolve(this.disabled);
  }
}
