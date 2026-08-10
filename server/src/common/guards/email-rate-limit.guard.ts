import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

export interface EmailRateLimitOptions {
  limit: number;
  windowMs: number;
}

export const EMAIL_RATE_LIMIT_KEY = 'emailRateLimit';

// Per-email budget for a route, applied on top of the IP-keyed @Throttle. Both are
// required by the security rules: @Throttle stops one host hammering the API, this
// stops a distributed spray from grinding a single account's password or flooding
// one inbox with magic links.
export const EmailRateLimit = (limit: number, windowMs: number) =>
  SetMetadata(EMAIL_RATE_LIMIT_KEY, { limit, windowMs });

// Cadence for dropping expired buckets. Done inline rather than on a timer so the
// map stays bounded without keeping an interval alive for the process's lifetime.
const SWEEP_INTERVAL_MS = 60 * 1000;

@Injectable()
export class EmailRateLimitGuard implements CanActivate {
  // Fixed windows keyed by `<handler>:<lowercased email>`, so each route keeps its own
  // budget. State is in-memory, therefore PER INSTANCE — behind more than one worker
  // this belongs in Redis (same caveat as ApiKeyGuard's throughput window).
  private readonly windows = new Map<
    string,
    { count: number; resetAt: number }
  >();
  private lastSweepAt = Date.now();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<EmailRateLimitOptions>(
      EMAIL_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request<unknown, unknown, { email?: unknown }>>();
    const raw = req.body?.email;
    // Guards run before the ValidationPipe. A missing/non-string email is a malformed
    // request, not an attempt against an account — let the pipe reject it as a 400
    // instead of spending a slot (or worse, keying a bucket on garbage).
    if (typeof raw !== 'string' || raw.trim().length === 0) return true;

    const now = Date.now();
    this.sweep(now);

    const key = `${context.getHandler().name}:${raw.trim().toLowerCase()}`;
    const bucket = this.windows.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }
    if (bucket.count >= options.limit) {
      throw new HttpException(
        'Too many requests for this email address. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    bucket.count += 1;
    return true;
  }

  private sweep(now: number): void {
    if (now - this.lastSweepAt < SWEEP_INTERVAL_MS) return;
    this.lastSweepAt = now;
    for (const [key, bucket] of this.windows) {
      if (bucket.resetAt <= now) this.windows.delete(key);
    }
  }
}
