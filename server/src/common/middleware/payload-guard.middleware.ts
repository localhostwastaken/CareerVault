import {
  BadRequestException,
  Injectable,
  type NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { findViolation } from './payload-inspection.js';

// Runs on every route after the body parser and before any guard, pipe or DTO, so nothing
// downstream ever sees a polluted or marked-up payload. The reply names the kind of problem,
// never the offending value.
@Injectable()
export class PayloadGuardMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const violation =
      findViolation(req.body as unknown) ?? findViolation(req.query as unknown);
    if (violation)
      throw new BadRequestException(
        `The request was refused because it contains ${violation}.`,
      );
    next();
  }
}
