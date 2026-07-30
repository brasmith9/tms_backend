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
});
