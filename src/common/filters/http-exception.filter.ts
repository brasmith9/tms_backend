import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

const PG_UNIQUE_VIOLATION = '23505';

interface Resolved {
  status: number;
  message: string;
  log: boolean;
}

/**
 * Global handler for every exception. Renders the uniform envelope
 * { code, message, data: null } — `code` is the HTTP status, validation errors
 * are joined into one message. HttpExceptions keep their status; a Postgres
 * unique-violation becomes 409; anything else is a logged 500 that never leaks
 * its internal message.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, message, log } = this.resolve(exception);

    if (log) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    res.status(status).json({ code: status, message, data: null });
  }

  private resolve(exception: unknown): Resolved {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      const raw =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] })?.message ??
            exception.message);
      return {
        status: exception.getStatus(),
        message: Array.isArray(raw) ? raw.join('; ') : raw,
        log: false,
      };
    }

    if (
      exception instanceof QueryFailedError &&
      (exception.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
    ) {
      return {
        status: HttpStatus.CONFLICT,
        message: 'Resource already exists',
        log: false,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      log: true,
    };
  }
}
