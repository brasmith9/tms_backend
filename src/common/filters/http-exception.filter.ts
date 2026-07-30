import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Renders every error in the uniform envelope: { code, message, data: null }.
 * `code` is the HTTP status; `message` is a human-readable string (validation
 * errors are joined into one).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = isHttp ? exception.getResponse() : null;
    const raw =
      typeof payload === 'string'
        ? payload
        : ((payload as { message?: string | string[] })?.message ??
          'Internal server error');
    const message = Array.isArray(raw) ? raw.join('; ') : raw;

    if (!isHttp) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    res.status(status).json({
      code: status,
      message: isHttp ? message : 'Internal server error',
      data: null,
    });
  }
}
