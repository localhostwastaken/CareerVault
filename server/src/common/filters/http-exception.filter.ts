import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  DataKeyUnavailableError,
  SigningKeyUnavailableError,
} from '../../services/key-management/key-management.service.js';

// Standard error envelope: { success:false, error:{ code, message, statusCode } }.
// class-validator produces a string[] message — we join it. 5xx are logged with stack.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    // Default stays generic: non-HttpException errors (e.g. Prisma/DB failures)
    // must never leak their raw message to the client.
    let message = 'Internal server error';

    // The two non-HttpExceptions we translate deliberately. Both are operational faults, not
    // caller mistakes, and the generic 500 above told a manager whose signature just failed
    // exactly nothing — the real cause (the key store did not survive a restart) was only
    // ever visible in the server log.
    if (exception instanceof SigningKeyUnavailableError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      code = 'SIGNING_KEY_UNAVAILABLE';
      message =
        "This organisation's signing key is not available, so the document cannot be signed right now. An administrator needs to restore the key store.";
    } else if (
      exception instanceof DataKeyUnavailableError &&
      exception.keyMismatch
    ) {
      // A wrong master key on every row, or one row whose key id was edited: the two look
      // the same, and calling a genuine document tampered would be the worse mistake. The
      // key ids stay in the server log only.
      status = HttpStatus.SERVICE_UNAVAILABLE;
      code = 'ENCRYPTION_KEY_UNAVAILABLE';
      message =
        'This record is encrypted under a key this deployment does not hold, so it cannot be read right now. An administrator needs to check KMS_MASTER_KEY.';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = codeFromStatus(status);
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        message = Array.isArray(b.message)
          ? (b.message as string[]).join('; ')
          : typeof b.message === 'string'
            ? b.message
            : exception.message;
        if (typeof b.code === 'string') code = b.code;
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Log the real error server-side while the client only sees `message`.
      const detail =
        exception instanceof Error ? exception.message : String(exception);
      this.logger.error(
        `${req.method} ${req.url} -> ${status}: ${detail}`,
        (exception as Error)?.stack,
      );
    }

    res
      .status(status)
      .json({ success: false, error: { code, message, statusCode: status } });
  }
}

function codeFromStatus(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'RATE_LIMITED',
  };
  return map[status] ?? 'ERROR';
}
