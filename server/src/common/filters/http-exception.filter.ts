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
    } else if (prismaKnownError(exception)) {
      // Prisma's own message names tables, columns and constraint targets: database
      // structure a client must never see. Map the common codes to a generic answer.
      const mapped = PRISMA_CODES[prismaKnownError(exception) as string];
      if (mapped) ({ status, code, message } = mapped);
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

const PRISMA_CODES: Record<
  string,
  { status: number; code: string; message: string }
> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    code: 'CONFLICT',
    message: 'A record with these details already exists.',
  },
  P2003: {
    status: HttpStatus.CONFLICT,
    code: 'CONFLICT',
    message: 'This record is still in use and cannot be changed that way.',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    code: 'NOT_FOUND',
    message: 'The record was not found.',
  },
};

/** The Prisma error code (e.g. "P2002") of a known request error, else null. */
function prismaKnownError(exception: unknown): string | null {
  if (
    exception instanceof Error &&
    exception.name === 'PrismaClientKnownRequestError' &&
    'code' in exception &&
    typeof exception.code === 'string'
  )
    return exception.code;
  return null;
}

function codeFromStatus(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    410: 'GONE',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'RATE_LIMITED',
  };
  return map[status] ?? 'ERROR';
}
