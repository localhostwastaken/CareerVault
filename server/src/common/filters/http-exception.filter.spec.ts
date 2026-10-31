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
      getRequest: () => ({ method: 'GET', url: '/api/v1/verify/document/x' }),
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
    ['NotFoundException', 404, 'NOT_FOUND', new NotFoundException('Not found')],
    ['GoneException', 410, 'GONE', new GoneException('Erased')],
  ])('passes a %s through as %i %s', (_, statusCode, code, exception) => {
    const { status, body } = send(exception);

    expect(status).toBe(statusCode);
    expect(body).toMatchObject({
      error: { code, message: exception.message, statusCode },
    });
  });

  // Prisma's messages name tables, columns and constraints; none of that may reach a client.
  it.each([
    ['P2002', 409, 'A record with these details already exists.'],
    ['P2025', 404, 'The record was not found.'],
  ])(
    'maps Prisma %s to %i without leaking the database message',
    (code, status, message) => {
      const error = Object.assign(
        new Error(
          'Unique constraint failed on the fields: (`email`) in table `users`',
        ),
        { name: 'PrismaClientKnownRequestError', code },
      );

      const sent = send(error);

      expect(sent.status).toBe(status);
      expect(sent.body).toMatchObject({ success: false, error: { message } });
      expect(JSON.stringify(sent.body)).not.toMatch(/users|email|constraint/i);
    },
  );

  it('never returns a stack trace or the raw message of an unexpected error', () => {
    const sent = send(
      new Error('relation "documents" does not exist at query.ts:42'),
    );

    expect(sent.status).toBe(500);
    expect(JSON.stringify(sent.body)).not.toMatch(/documents|query\.ts|stack/);
  });
});
