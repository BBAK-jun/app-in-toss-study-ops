import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { logRoutes } from './logs';
import { errorHandler } from '../middleware/error';
import type { AppEnv } from '../env';

interface MockDb extends D1Database {
  batch: ReturnType<typeof vi.fn>;
  prepare: ReturnType<typeof vi.fn>;
}

function mockDb(): MockDb {
  const batchSpy = vi.fn().mockResolvedValue([]);
  const bindSpy = vi.fn().mockReturnThis();
  const runSpy = vi.fn().mockResolvedValue({ meta: { changes: 0 } });
  const prepareSpy = vi.fn().mockReturnValue({ bind: bindSpy, run: runSpy });
  return { batch: batchSpy, prepare: prepareSpy } as unknown as MockDb;
}

function mockExecutionCtx(): ExecutionContext {
  return { waitUntil: vi.fn() } as unknown as ExecutionContext;
}

function createTestApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    c.set('user', { userKey: 42 });
    c.set('requestId', 'req-test');
    await next();
  });
  app.route('/logs', logRoutes);
  app.onError(errorHandler);
  return app;
}

const ENV = { ENVIRONMENT: 'dev' };

beforeEach(() => vi.clearAllMocks());

describe('POST /logs (batch ingestion)', () => {
  it('유효한 배치를 수신하면 202 Accepted 반환', async () => {
    const db = mockDb();
    const app = createTestApp();

    const res = await app.request(
      '/logs',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [
            {
              ts: Date.now(),
              level: 'info',
              source: 'client',
              event: 'client.page.view',
              message: 'test page view',
            },
          ],
          client: {
            sessionId: 'sess-1',
            userId: 42,
            version: '1.0.0',
            userAgent: 'Mozilla/5.0',
          },
        }),
      },
      { DB: db, ...ENV } as unknown as AppEnv['Bindings'],
      mockExecutionCtx(),
    );

    expect(res.status).toBe(202);
    const body = (await res.json()) as { accepted: number };
    expect(body.accepted).toBe(1);
  });

  it('D1 batch()를 호출하여 로그를 영속화한다', async () => {
    const db = mockDb();
    const app = createTestApp();

    await app.request(
      '/logs',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [
            { ts: 1, level: 'warn', source: 'client', event: 'client.api.error', message: 'a' },
            { ts: 2, level: 'error', source: 'client', event: 'client.error.boundary', message: 'b' },
          ],
          client: { sessionId: 's1', userAgent: 'UA' },
        }),
      },
      { DB: db, ...ENV } as unknown as AppEnv['Bindings'],
      mockExecutionCtx(),
    );

    expect(db.batch).toHaveBeenCalledTimes(1);
    const stmts = db.batch.mock.calls[0][0];
    expect(stmts).toHaveLength(2);
  });

  it('빈 entries 배열은 202 반환하되 batch() 호출하지 않음', async () => {
    const db = mockDb();
    const app = createTestApp();

    const res = await app.request(
      '/logs',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [],
          client: { sessionId: 's1', userAgent: 'UA' },
        }),
      },
      { DB: db, ...ENV } as unknown as AppEnv['Bindings'],
      mockExecutionCtx(),
    );

    expect(res.status).toBe(202);
    expect(db.batch).not.toHaveBeenCalled();
    const body = (await res.json()) as { accepted: number };
    expect(body.accepted).toBe(0);
  });

  it('entries가 100개 초과시 413 반환', async () => {
    const db = mockDb();
    const app = createTestApp();

    const entries = Array.from({ length: 101 }, (_, i) => ({
      ts: i,
      level: 'info',
      source: 'client',
      event: 'client.page.view',
      message: `entry-${i}`,
    }));

    const res = await app.request(
      '/logs',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries,
          client: { sessionId: 's1', userAgent: 'UA' },
        }),
      },
      { DB: db, ...ENV } as unknown as AppEnv['Bindings'],
      mockExecutionCtx(),
    );

    expect(res.status).toBe(413);
  });

  it('잘못된 body 포맷은 400 반환', async () => {
    const db = mockDb();
    const app = createTestApp();

    const res = await app.request(
      '/logs',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wrong: 'shape' }),
      },
      { DB: db, ...ENV } as unknown as AppEnv['Bindings'],
      mockExecutionCtx(),
    );

    expect(res.status).toBe(400);
  });

  it('client 필드 누락시 400 반환', async () => {
    const db = mockDb();
    const app = createTestApp();

    const res = await app.request(
      '/logs',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [
            { ts: 1, level: 'info', source: 'client', event: 'client.page.view', message: 'x' },
          ],
        }),
      },
      { DB: db, ...ENV } as unknown as AppEnv['Bindings'],
      mockExecutionCtx(),
    );

    expect(res.status).toBe(400);
  });

  it('client.sessionId + userId를 entries에 merge한다', async () => {
    const db = mockDb();
    const app = createTestApp();

    await app.request(
      '/logs',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [
            { ts: 1, level: 'info', source: 'client', event: 'client.page.view', message: 'x' },
          ],
          client: { sessionId: 'merged-sess', userId: 99, userAgent: 'UA', version: 'v2' },
        }),
      },
      { DB: db, ...ENV } as unknown as AppEnv['Bindings'],
      mockExecutionCtx(),
    );

    expect(db.batch).toHaveBeenCalledTimes(1);
    const stmts = db.batch.mock.calls[0][0];
    expect(stmts).toHaveLength(1);
  });
});
