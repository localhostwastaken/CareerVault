import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Standard success envelope: { success, data, meta? }. A handler that returns
// { data, meta } (e.g. paginated lists) has its meta preserved; anything else
// becomes `data`. Errors never pass through here — see HttpExceptionFilter.
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: unknown;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccess<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccess<T>> {
    return next.handle().pipe(
      map((payload): ApiSuccess<T> => {
        if (
          payload &&
          typeof payload === 'object' &&
          'data' in payload &&
          'meta' in payload
        ) {
          const { data, meta } = payload as { data: T; meta: unknown };
          return { success: true, data, meta };
        }
        return { success: true, data: payload };
      }),
    );
  }
}
