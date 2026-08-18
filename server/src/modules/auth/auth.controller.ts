import { randomBytes } from 'node:crypto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CsrfGuard } from '../../common/guards/csrf.guard.js';
import {
  EmailRateLimit,
  EmailRateLimitGuard,
} from '../../common/guards/email-rate-limit.guard.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import {
  MagicLinkRequestDto,
  VerifyMagicLinkDto,
} from './dto/magic-link.dto.js';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password-reset.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { SetPasswordDto } from './dto/set-password.dto.js';
import { MagicLinkService } from './magic-link.service.js';

const REFRESH_COOKIE = 'cv_refresh';
const CSRF_COOKIE = 'cv_csrf';
const COOKIE_PATH = '/api/v1/auth';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function cookieSecurity(): Pick<CookieOptions, 'sameSite' | 'secure' | 'partitioned'> {
  return process.env.NODE_ENV === 'production'
    ? { sameSite: 'none', secure: true, partitioned: true }
    : { sameSite: 'lax', secure: false };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly magicLink: MagicLinkService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto, requestContext(req));
    this.setRefreshCookie(res, result.refreshToken);
    this.setCsrfCookie(res);
    return { token: result.token, user: result.user };
  }

  // @Throttle is IP-keyed; the per-email budget additionally caps attempts against a
  // single account when they arrive from many addresses.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(EmailRateLimitGuard)
  @EmailRateLimit(10, 60_000)
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto, requestContext(req));
    this.setRefreshCookie(res, result.refreshToken);
    this.setCsrfCookie(res);
    return { token: result.token, user: result.user };
  }

  // Deliberately does NOT rotate the CSRF cookie (see setCsrfCookie) — with
  // multiple tabs sharing one cookie jar, a background refresh in one tab used
  // to rotate cv_csrf out from under an in-flight logout/refresh in another,
  // producing a spurious 403 that only a retry would clear.
  @Public()
  @UseGuards(CsrfGuard)
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.refresh(
      readRefreshCookie(req),
      requestContext(req),
    );
    this.setRefreshCookie(res, result.refreshToken);
    return { token: result.token, user: result.user };
  }

  @UseGuards(CsrfGuard)
  @HttpCode(200)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(readRefreshCookie(req));
    // clearCookie only deletes when sameSite/secure/path match the set cookie.
    const security = cookieSecurity();
    res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH, ...security });
    res.clearCookie(CSRF_COOKIE, { path: '/', ...security });
    return { message: 'Signed out' };
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  // Set an initial password for users who were created without one (R9: member-add).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('set-password')
  async setPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetPasswordDto,
  ) {
    return this.auth.setPassword(user.id, dto.password);
  }

  // Change an existing password. Requires the current password.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user.id, dto.oldPassword, dto.newPassword);
  }

  // Per-email cap is deliberately tighter than login's: each accepted call sends mail,
  // so an uncapped endpoint is an inbox-flooding tool aimed at one address.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(EmailRateLimitGuard)
  @EmailRateLimit(5, HOUR_MS)
  @HttpCode(200)
  @Post('magic-link')
  async requestMagicLink(@Body() dto: MagicLinkRequestDto) {
    await this.magicLink.request(dto.email, 'EMAIL_VERIFY');
    return {
      message: 'If the email is registered, a sign-in link has been sent.',
    };
  }

  // Password recovery, step 1. Always answers the same way — a differing response would
  // turn this into an account-enumeration oracle.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(EmailRateLimitGuard)
  @EmailRateLimit(5, HOUR_MS)
  @HttpCode(200)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return {
      message: 'If the email is registered, a reset link has been sent.',
    };
  }

  // Password recovery, step 2. No email in the body (the link carries the identity), so
  // only the IP throttle applies here. Deliberately does not sign the user in: they
  // re-authenticate with the new password, which also proves it was stored.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return {
      message: 'Password updated. Sign in with your new password.',
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('verify-magic-link')
  async verifyMagicLink(
    @Body() dto: VerifyMagicLinkDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.loginWithMagicLink(
      dto.token,
      requestContext(req),
    );
    this.setRefreshCookie(res, result.refreshToken);
    this.setCsrfCookie(res);
    return { token: result.token, user: result.user };
  }

  private setRefreshCookie(res: Response, token: string): void {
    const security = cookieSecurity();
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      ...security,
      path: COOKIE_PATH,
      maxAge: COOKIE_MAX_AGE,
    });
  }

  // Double-submit CSRF token: non-httpOnly so same-origin JS can read it and echo it back in the x-csrf-token header. Path '/' keeps it readable app-wide. Only minted on register/login/verify-magic-link — a fresh value per session, not per request — so it stays stable across the silent refreshes a long-lived tab performs. See the comment on `refresh()` for why that stability matters.
  private setCsrfCookie(res: Response): void {
    const security = cookieSecurity();
    res.cookie(CSRF_COOKIE, randomBytes(24).toString('hex'), {
      httpOnly: false,
      ...security,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
  }
}

function readRefreshCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
}

function requestContext(req: Request): { ip?: string; userAgent?: string } {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}
