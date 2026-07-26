import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { requestIdMiddleware } from './request-id';

function createApp() {
  const app = new Hono<AppEnv>();
  app.use('*', requestIdMiddleware);
  app.get('/', (c) => c.text(c.get('requestId')));
  return app;
}

describe('requestIdMiddleware', () => {
  it('uses cf-ray header when present', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/', { headers: { 'cf-ray': 'abc123def' } }),
    );
    expect(res.headers.get('X-Request-Id')).toBe('abc123def');
    expect(await res.text()).toBe('abc123def');
  });

  it('generates a UUIDv4 when cf-ray is absent', async () => {
    const res = await createApp().fetch(new Request('http://localhost/'));
    const requestId = res.headers.get('X-Request-Id');
    expect(requestId).toBeTruthy();
    // UUIDv4 format: 8-4-4-4-12 hex digits
    expect(requestId!).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('generates unique IDs per request', async () => {
    const app = createApp();
    const [res1, res2] = await Promise.all([
      app.fetch(new Request('http://localhost/')),
      app.fetch(new Request('http://localhost/')),
    ]);
    const id1 = res1.headers.get('X-Request-Id');
    const id2 = res2.headers.get('X-Request-Id');
    expect(id1).not.toBe(id2);
  });

  it('sets requestId in Hono context (accessible via c.get)', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/', { headers: { 'cf-ray': 'ray-xyz' } }),
    );
    // Body echoes c.get('requestId') — proves context value is set
    expect(await res.text()).toBe('ray-xyz');
  });

  it('ignores empty cf-ray header and generates UUID', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/', { headers: { 'cf-ray': '' } }),
    );
    const requestId = res.headers.get('X-Request-Id');
    // Empty string header — Hono treats it as absent. Should fall back to UUID.
    expect(requestId).toBeTruthy();
    expect(requestId!).not.toBe('');
  });
});
