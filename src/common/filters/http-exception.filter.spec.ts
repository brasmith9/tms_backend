import { ArgumentsHost, NotFoundException } from '@nestjs/common';
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
  it('renders the standard envelope for an HttpException', () => {
    const { host, status, json } = mockHost();
    new HttpExceptionFilter().catch(
      new NotFoundException('Tour with id 42 not found'),
      host,
    );
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Tour with id 42 not found',
        error: 'Not Found',
        path: '/api/v1/tours/42',
        timestamp: expect.any(String),
      }),
    );
  });

  it('maps an unknown error to a 500 without leaking its message', () => {
    const { host, status, json } = mockHost();
    new HttpExceptionFilter().catch(new Error('boom: secret detail'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
        message: expect.not.stringContaining('secret detail'),
      }),
    );
  });
});
