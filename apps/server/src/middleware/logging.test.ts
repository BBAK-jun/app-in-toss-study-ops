// 로깅 미들웨어 단위 테스트.
// 핵심 검증: requestId 부여, 응답 헤더, 4xx/5xx 자동 에러 로깅, duration 계산.
// logger.log 자체는 logger.test.ts에서 검증 → 여기서는 mock으로 호출 여부만 확인.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// logger 모듈 전체 mock — log 함수 호출 기록만 남김.
vi.mock('../lib/logger', () => ({
  log: vi.fn(),
  buildLogContext: vi.fn(() => ({
    db: {},
    executionCtx: { waitUntil: vi.fn() },
    env: 'dev' as const,
  })),
}));

import { log } from '../lib/logger';
import { loggingMiddleware } from './logging';
import { requestIdMiddleware } from './request-id';
import type { AppEnv } from '../env';

function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use('*', requestIdMiddleware);
  app.use('*', loggingMiddleware);
  app.get('/ok', (c) => c.json({ ok: true }));
  app.get('/not-found', (c) => c.json({ error: 'no' }, 404));
  app.get('/server-error', () => {
    throw new Error('boom');
  });
  app.onError((err, c) => c.json({ error: err.message }, 500));
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('loggingMiddleware', () => {
  it('응답 헤더에 X-Request-Id를 포함한다', async () => {
    const app = createApp();
    const res = await app.request('/ok');
    expect(res.headers.get('X-Request-Id')).toBeTruthy();
    expect(res.headers.get('X-Request-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('정상(2xx) 응답에서는 log를 호출하지 않는다 (핵심 비즈니스 로그만 명시적으로 남김)', async () => {
    const app = createApp();
    await app.request('/ok');
    // 미들웨어는 4xx/5xx만 자동 로깅. 2xx는 라우트가 명시적으로 로깅.
    expect(log).not.toHaveBeenCalled();
  });

  it('4xx 응답에서 warn 레벨로 로깅한다', async () => {
    const app = createApp();
    const res = await app.request('/not-found');
    expect(res.status).toBe(404);
    expect(log).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(log).mock.calls[0];
    expect(callArgs).toBeDefined();
    // 두 번째 인자가 entry. c는 첫 번째.
    const entry = callArgs?.[1] as { level: string; status: number; event: string };
    expect(entry.level).toBe('warn');
    expect(entry.status).toBe(404);
    expect(entry.event).toBe('infra.http.client_error');
  });

  it('5xx 응답에서 error 레벨로 로깅한다', async () => {
    const app = createApp();
    const res = await app.request('/server-error');
    expect(res.status).toBe(500);
    expect(log).toHaveBeenCalledTimes(1);
    const entry = vi.mocked(log).mock.calls[0]?.[1] as {
      level: string;
      status: number;
    };
    expect(entry.level).toBe('error');
    expect(entry.status).toBe(500);
  });

  it('로그 엔트리에 durationMs가 포함된다', async () => {
    const app = createApp();
    await app.request('/not-found');
    const entry = vi.mocked(log).mock.calls[0]?.[1] as { durationMs?: number };
    expect(entry.durationMs).toBeDefined();
    expect(typeof entry.durationMs).toBe('number');
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('로그 엔트리에 method, path, requestId가 포함된다', async () => {
    const app = createApp();
    const res = await app.request('/not-found');
    const entry = vi.mocked(log).mock.calls[0]?.[1] as {
      method?: string;
      path?: string;
      requestId?: string;
    };
    expect(entry.method).toBe('GET');
    expect(entry.path).toBe('/not-found');
    expect(entry.requestId).toBeTruthy();
    // 헤더와 동일 값이어야 함.
    expect(entry.requestId).toBe(res.headers.get('X-Request-Id'));
  });
});
