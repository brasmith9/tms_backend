import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE } from '../decorators/response-message.decorator';

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * Wraps every successful controller return value in the uniform
 * { code, message, data } envelope. `code` mirrors the HTTP status; `message`
 * defaults from the status and can be overridden with @ResponseMessage().
 */
@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<
  T,
  ApiEnvelope<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiEnvelope<T>> {
    const res = context.switchToHttp().getResponse<Response>();
    const override = this.reflector.getAllAndOverride<string | undefined>(
      RESPONSE_MESSAGE,
      [context.getHandler(), context.getClass()],
    );
    return next.handle().pipe(
      map((data) => {
        const code = res.statusCode;
        return {
          code,
          message: override ?? defaultMessage(code),
          data: (data ?? null) as T,
        };
      }),
    );
  }
}

function defaultMessage(code: number): string {
  if (code === 201) return 'Created';
  return 'OK';
}
