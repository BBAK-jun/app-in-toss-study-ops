import { describe, it, expect, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { authLoginRateLimit } from './rate-limit';
import { errorHandler } from './error';

function makeEnv(limitFn: ReturnType<typeof vi.fn>): AppEnv['Bindings'] {
  return {
    ...env,
    SESSION_SECRET: 'test-session-secret-at-least-32-chars-long',
    MCP_API_TOKEN: 'test-mcp-token',
    AUTH_RATE_LIMITER: { limit: limitFn },
  } as AppEnv['Bindings'];
}

function createApp() {
  const app = new Hono<AppEnv>();
  app.onError(errorHandler);
  app.use('*', authLoginRateLimit);
  app.get('/', (c) => c.text('ok'));
  return app;
}

describe('authLoginRateLimit', () => {
  it('allows request when rate limit succeeds', async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    const app = createApp();
    const res = await app.fetch(
      new Request('http://localhost/', {
        headers: { 'cf-connecting-ip': '1.2.3.4' },
      }),
      makeEnv(limit),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
    expect(limit).toHaveBeenCalledWith({ key: 'login:1.2.3.4' });
  });

  it('returns 429 with TOO_MANY_REQUESTS when rate limit exceeded', async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });
    const app = createApp();
    const res = await app.fetch(
      new Request('http://localhost/', {
        headers: { 'cf-connecting-ip': '1.2.3.4' },
      }),
      makeEnv(limit),
    );
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(body.error.message).toBeTruthy();
  });

  it('falls back to "unknown" key when cf-connecting-ip is absent', async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    const app = createApp();
    await app.fetch(
      new Request('http://localhost/'),
      makeEnv(limit),
    );
    expect(limit).toHaveBeenCalledWith({ key: 'login:unknown' });
  });
});
