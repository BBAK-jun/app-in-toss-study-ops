import { describe, it, expect } from 'vitest';
import { sanitizeContext, shouldSample, buildLogContext } from './logger';

describe('sanitizeContext', () => {
  it('passes through allowlisted keys unchanged', () => {
    const result = sanitizeContext({
      studyId: 's-1',
      roundId: 'r-1',
      ownerId: 42,
      title: '스터디',
    });
    expect(result).toEqual({
      studyId: 's-1',
      roundId: 'r-1',
      ownerId: 42,
      title: '스터디',
    });
  });

  it('redacts non-allowlisted keys', () => {
    const result = sanitizeContext({
      studyId: 's-1',
      email: 'user@example.com',
      accessToken: 'abc123',
    });
    expect(result).toEqual({
      studyId: 's-1',
      email: '[REDACTED]',
      accessToken: '[REDACTED]',
    });
  });

  it('recursively sanitizes nested objects under allowlisted container keys', () => {
    const result = sanitizeContext({
      studyId: 's-1',
      details: {
        ownerId: 42,
        ip: '1.2.3.4',
      },
    });
    expect(result).toEqual({
      studyId: 's-1',
      details: {
        ownerId: 42,
        ip: '[REDACTED]',
      },
    });
  });

  it('redacts entire non-allowlisted parent keys (no recursion)', () => {
    const result = sanitizeContext({
      studyId: 's-1',
      meta: {
        ownerId: 42,
        ip: '1.2.3.4',
      },
    });
    expect(result).toEqual({
      studyId: 's-1',
      meta: '[REDACTED]',
    });
  });

  it('passes arrays through without sanitizing elements', () => {
    const result = sanitizeContext({
      notSubmittedHandles: ['@alice', '@bob'],
    });
    expect(result).toEqual({
      notSubmittedHandles: ['@alice', '@bob'],
    });
  });

  it('returns null for undefined input', () => {
    expect(sanitizeContext(undefined)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(sanitizeContext(null as unknown as undefined)).toBeNull();
  });

  it('returns empty object for empty object input', () => {
    expect(sanitizeContext({})).toEqual({});
  });
});

describe('shouldSample', () => {
  const baseEntry = {
    level: 'info' as const,
    event: 'study.created' as const,
    message: 'test',
    ts: 1700000000000,
    forceSample: false,
  };

  it('always samples in dev environment', () => {
    expect(shouldSample({ ...baseEntry, level: 'debug' }, 'dev')).toBe(true);
    expect(shouldSample({ ...baseEntry, level: 'info' }, 'dev')).toBe(true);
  });

  it('always samples when forceSample is true in production', () => {
    expect(
      shouldSample({ ...baseEntry, level: 'info', forceSample: true }, 'production'),
    ).toBe(true);
  });

  it('never samples debug in production (0% rate)', () => {
    expect(
      shouldSample({ ...baseEntry, level: 'debug' }, 'production'),
    ).toBe(false);
  });

  it('always samples warn/error/fatal in production (100% rate)', () => {
    expect(shouldSample({ ...baseEntry, level: 'warn' }, 'production')).toBe(true);
    expect(shouldSample({ ...baseEntry, level: 'error' }, 'production')).toBe(true);
    expect(shouldSample({ ...baseEntry, level: 'fatal' }, 'production')).toBe(true);
  });

  it('is deterministic for info in production (same input = same result)', () => {
    const entry = { ...baseEntry, level: 'info' as const };
    const result1 = shouldSample(entry, 'production');
    const result2 = shouldSample(entry, 'production');
    expect(result1).toBe(result2);
  });

  it('passes approximately 10% of info logs in production', () => {
    let passed = 0;
    const total = 1000;
    for (let i = 0; i < total; i++) {
      if (
        shouldSample(
          { ...baseEntry, level: 'info', ts: baseEntry.ts + i },
          'production',
        )
      ) {
        passed++;
      }
    }
    expect(passed).toBeGreaterThan(total * 0.05);
    expect(passed).toBeLessThan(total * 0.15);
  });
});

describe('buildLogContext', () => {
  it('extracts env, requestId, logServerUrl, discordWebhookDefault from Hono Context', () => {
    const fakeContext = {
      env: {
        DB: {} as D1Database,
        ENVIRONMENT: 'production',
        DISCORD_WEBHOOK_DEFAULT: 'https://discord.com/...',
        LOG_SERVER_URL: 'https://log-server.example.com',
      },
      executionCtx: { waitUntil: () => {} } as unknown as ExecutionContext,
      get: (key: string) => {
        if (key === 'requestId') return 'req-123';
        return undefined;
      },
    };
    const ctx = buildLogContext(fakeContext as never);
    expect(ctx.env).toBe('production');
    expect(ctx.requestId).toBe('req-123');
    expect(ctx.logServerUrl).toBe('https://log-server.example.com');
    expect(ctx.discordWebhookDefault).toBe('https://discord.com/...');
  });

  it('detects dev environment', () => {
    const fakeContext = {
      env: { DB: {}, ENVIRONMENT: 'dev' },
      executionCtx: {} as ExecutionContext,
      get: () => undefined,
    };
    const ctx = buildLogContext(fakeContext as never);
    expect(ctx.env).toBe('dev');
  });
});
