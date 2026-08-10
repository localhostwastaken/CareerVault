import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

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

    if (exception instanceof HttpException) {
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
