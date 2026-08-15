import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

const CSRF_COOKIE = 'cv_csrf';
const CSRF_HEADER = 'x-csrf-token';

// Double-submit CSRF defense for cookie-authenticated, state-changing routes
// (POST /auth/refresh, POST /auth/logout). In production the client is
// cross-site (Vercel frontend, Render API) so the refresh cookie is
// SameSite=None and the browser attaches it to cross-site requests — which
// re-opens CSRF on those routes. We require the request to echo the non-httpOnly
// `cv_csrf` cookie back in the `x-csrf-token` header; only same-origin JS can
// read that cookie, so a forged cross-site POST cannot supply a matching header.
//
// Exemptions keep dev and first-call flows working: no enforcement outside
// production, and none until the client actually holds a cv_csrf cookie (it is
// minted by register/login/verify-magic-link). Once the cookie is present in
// production, the header must match it or the request is rejected with 403.
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV !== 'production') return true;

    const req = context.switchToHttp().getRequest<Request>();
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.[
      CSRF_COOKIE
    ];
    if (!cookieToken) return true;

    const headerRaw = req.headers[CSRF_HEADER];
    const headerToken = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
    if (!headerToken || headerToken !== cookieToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }
}
