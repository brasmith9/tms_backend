import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { HttpExceptionFilter } from './http-exception.filter';

function mockHost(url = '/api/v1/tours/42') {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  it('renders the uniform envelope for an HttpException', () => {
    const { host, status, json } = mockHost();
    new HttpExceptionFilter().catch(
      new NotFoundException('Tour with id 42 not found'),
      host,
    );
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      code: 404,
      message: 'Tour with id 42 not found',
      data: null,
    });
  });

  it('maps an unknown error to a 500 without leaking its message', () => {
    const { host, status, json } = mockHost();
    new HttpExceptionFilter().catch(new Error('boom: secret detail'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal server error',
      data: null,
    });
  });

  it('maps a Postgres unique violation to a 409', () => {
    const { host, status, json } = mockHost();
    const dbError = new QueryFailedError('INSERT ...', [], new Error('dup'));
    (dbError.driverError as { code?: string }).code = '23505';
    new HttpExceptionFilter().catch(dbError, host);
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      code: 409,
      message: 'Resource already exists',
      data: null,
    });
  });
});
