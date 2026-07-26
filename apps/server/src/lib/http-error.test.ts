import { describe, it, expect } from 'vitest';
import { HttpError, formatHttpError } from './http-error';
import type { FormatErrorContext } from './http-error';

const ctx: FormatErrorContext = {
  requestId: 'req-123',
  method: 'GET',
  path: '/studies/1',
  userKey: 42,
};

describe('HttpError', () => {
  it('sets status, code, message, name', () => {
    const err = new HttpError(404, 'NOT_FOUND', 'Study not found');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Study not found');
    expect(err.name).toBe('HttpError');
    expect(err instanceof Error).toBe(true);
  });
});

describe('formatHttpError — HttpError input', () => {
  it('returns correct status, body, headers', async () => {
    const res = formatHttpError(new HttpError(404, 'NOT_FOUND', 'Study not found'), ctx);
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('X-Request-Id')).toBe('req-123');
    expect(await res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Study not found' } });
  });

  it('preserves all ApiErrorCode values', async () => {
    const cases: Array<[number, import('@studyops/shared').ApiErrorCode, string]> = [
      [401, 'UNAUTHORIZED', 'No session'],
      [403, 'FORBIDDEN', 'Not owner'],
      [409, 'CONFLICT', 'Already joined'],
      [422, 'VALIDATION_ERROR', 'Invalid round'],
      [401, 'TOSS_AUTH_FAILED', 'Toss rejected'],
      [502, 'DISCORD_WEBHOOK_FAILED', 'Webhook down'],
    ];
    for (const [status, code, message] of cases) {
      const res = formatHttpError(new HttpError(status, code, message), ctx);
      const body = (await res.json()) as import('@studyops/shared').ApiErrorResponse;
      expect(res.status).toBe(status);
      expect(body.error.code).toBe(code);
      expect(body.error.message).toBe(message);
    }
  });

  it('includes userKey in structured log output', async () => {
    // formatHttpError logs to console.error as JSON — verify it doesn't throw.
    const originalError = console.error;
    let logged: unknown;
    console.error = (msg: unknown) => { logged = msg; };
    try {
      formatHttpError(new HttpError(422, 'VALIDATION_ERROR', 'bad'), ctx);
      expect(typeof logged).toBe('string');
      const parsed = JSON.parse(logged as string);
      expect(parsed.userKey).toBe(42);
      expect(parsed.requestId).toBe('req-123');
    } finally {
      console.error = originalError;
    }
  });
});

describe('formatHttpError — unknown error input', () => {
  it('returns 500 INTERNAL_ERROR for generic Error', async () => {
    const res = formatHttpError(new Error('database connection lost'), ctx);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  it('returns 500 INTERNAL_ERROR for non-Error throwables', async () => {
    const res = formatHttpError('a string was thrown', ctx);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  it('returns 500 INTERNAL_ERROR for null/undefined', async () => {
    const res = formatHttpError(null, ctx);
    expect(res.status).toBe(500);
    expect(res.headers.get('X-Request-Id')).toBe('req-123');
  });

  it('logs stack trace for unhandled errors', async () => {
    const originalError = console.error;
    let logged: unknown;
    console.error = (msg: unknown) => { logged = msg; };
    try {
      formatHttpError(new Error('boom'), { ...ctx, userKey: null });
      const parsed = JSON.parse(logged as string);
      expect(parsed.event).toBe('unhandled_error');
      expect(parsed.level).toBe('error');
      expect(parsed.userKey).toBeNull();
      expect(typeof parsed.stack).toBe('string');
    } finally {
      console.error = originalError;
    }
  });
});
