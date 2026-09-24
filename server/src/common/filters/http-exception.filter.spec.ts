import { GoneException, NotFoundException } from '@nestjs/common';
import {
  DataKeyUnavailableError,
  SigningKeyUnavailableError,
} from '../../services/key-management/key-management.service.js';
import { HttpExceptionFilter } from './http-exception.filter.js';

/**
 * The error envelope for the faults the filter translates on purpose. A data key wrapped
 * under another key id is what a deployment running the wrong KMS_MASTER_KEY sees on every
 * row, so it must read as a clear 503, never as tampering and never as a bare 500.
 */

const KEY = '0123456789abcdef';
const OTHER = 'fedcba9876543210';

function send(exception: unknown) {
  const sent: { status?: number; body?: unknown } = {};
  const res = {
    status: (status: number) => {
      sent.status = status;
      return res;
    },
    json: (body: unknown) => {
      sent.body = body;
      return res;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({ method: 'GET', url: '/api/v1/verify/hash/x' }),
    }),
  };
  const filter = new HttpExceptionFilter();
  Object.assign(filter, { logger: { error: () => undefined } });
  filter.catch(exception, host as never);
  return sent;
}

describe('HttpExceptionFilter', () => {
  it('answers a data key wrapped under another key id with a 503 that names no key', () => {
    const { status, body } = send(
      new DataKeyUnavailableError(OTHER, KEY, `wrapped under ${OTHER}`),
    );

    expect(status).toBe(503);
    expect(body).toEqual({
      success: false,
      error: {
        code: 'ENCRYPTION_KEY_UNAVAILABLE',
        message: expect.stringContaining('KMS_MASTER_KEY') as string,
        statusCode: 503,
      },
    });
    expect(JSON.stringify(body)).not.toContain(OTHER);
    expect(JSON.stringify(body)).not.toContain(KEY);
  });

  // Under our own key id the row itself is damaged; outside public verification, which
  // reports it as INVALID, that stays an ordinary internal error.
  it('keeps a failed unwrap under our own key id a generic 500', () => {
    const { status, body } = send(
      new DataKeyUnavailableError(KEY, KEY, 'failed authentication'),
    );

    expect(status).toBe(500);
    expect(body).toMatchObject({ error: { code: 'INTERNAL_ERROR' } });
  });

  it('still maps an unavailable signing key to its own 503', () => {
    const { status, body } = send(
      new SigningKeyUnavailableError('local-kms:org', 'key file is missing'),
    );

    expect(status).toBe(503);
    expect(body).toMatchObject({ error: { code: 'SIGNING_KEY_UNAVAILABLE' } });
  });

  it.each([
    ['NotFoundException', new NotFoundException('Not found'), 404, 'NOT_FOUND'],
    ['GoneException', new GoneException('Erased'), 410, 'GONE'],
  ])('passes a %s through as %i %s', (_, exception, statusCode, code) => {
    const { status, body } = send(exception);

    expect(status).toBe(statusCode);
    expect(body).toMatchObject({
      error: { code, message: exception.message, statusCode },
    });
  });
});
