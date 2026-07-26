import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

vi.mock('../lib/log-forwarder', () => ({
  forwardToLogServer: vi.fn().mockResolvedValue(undefined),
}));

import { forwardToLogServer } from '../lib/log-forwarder';
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

let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

function parseLogCall(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> | null {
  const raw = spy.mock.calls[0]?.[0] as string | undefined;
  if (!raw) return null;
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
}

describe('loggingMiddleware', () => {
  it('includes X-Request-Id in response headers', async () => {
    const app = createApp();
    const res = await app.request('/ok');
    expect(res.headers.get('X-Request-Id')).toBeTruthy();
    expect(res.headers.get('X-Request-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('does not log on 2xx responses', async () => {
    const app = createApp();
    await app.request('/ok');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('logs warn level for 4xx responses', async () => {
    const app = createApp();
    const res = await app.request('/not-found');
    expect(res.status).toBe(404);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const entry = parseLogCall(consoleWarnSpy);
    expect(entry).not.toBeNull();
    expect(entry!.level).toBe('warn');
    expect(entry!.status).toBe(404);
    expect(entry!.event).toBe('infra.http.client_error');
  });

  it('logs error level for 5xx responses', async () => {
    const app = createApp();
    const res = await app.request('/server-error');
    expect(res.status).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const entry = parseLogCall(consoleErrorSpy);
    expect(entry).not.toBeNull();
    expect(entry!.level).toBe('error');
    expect(entry!.status).toBe(500);
  });

  it('includes durationMs in log entries', async () => {
    const app = createApp();
    await app.request('/not-found');
    const entry = parseLogCall(consoleWarnSpy);
    expect(entry).not.toBeNull();
    expect(entry!.durationMs).toBeDefined();
    expect(typeof entry!.durationMs).toBe('number');
    expect(entry!.durationMs as number).toBeGreaterThanOrEqual(0);
  });

  it('includes method, path, requestId in log entries', async () => {
    const app = createApp();
    const res = await app.request('/not-found');
    const entry = parseLogCall(consoleWarnSpy);
    expect(entry).not.toBeNull();
    expect(entry!.method).toBe('GET');
    expect(entry!.path).toBe('/not-found');
    expect(entry!.requestId).toBeTruthy();
    expect(entry!.requestId).toBe(res.headers.get('X-Request-Id'));
  });

  it('forwards logs to log-server via forwardToLogServer', async () => {
    const app = createApp();
    await app.request('/not-found');
    expect(forwardToLogServer).toHaveBeenCalledTimes(1);
  });
});
