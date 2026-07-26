import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { corsMiddleware } from './cors';

// worker-configuration.d.ts 가 ALLOWED_ORIGINS 을 리터럴 타입("https://apps-in-toss.toss.im")으로
// 생성하므로, 테스트에서 임의 문자열을 주입하려면 타입을 string 으로 넓혀야 한다.
type TestEnvOverrides = Omit<Partial<AppEnv['Bindings']>, 'ALLOWED_ORIGINS'> & {
  ALLOWED_ORIGINS?: string;
};

function makeEnv(overrides: TestEnvOverrides = {}): AppEnv['Bindings'] {
  return {
    ...env,
    ENVIRONMENT: 'dev',
    SESSION_SECRET: 'test-session-secret-at-least-32-chars-long',
    MCP_API_TOKEN: 'test-mcp-token',
    ...overrides,
  } as AppEnv['Bindings'];
}

function createApp() {
  const app = new Hono<AppEnv>();
  app.use('*', corsMiddleware);
  app.get('*', (c) => c.text('ok'));
  return app;
}

describe('corsMiddleware — dev environment', () => {
  it('allows localhost:5173 origin', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/', { headers: { Origin: 'http://localhost:5173' } }),
      makeEnv(),
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(res.headers.get('Vary')).toBe('Origin');
  });

  it('allows localhost:8787 origin', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/', { headers: { Origin: 'http://localhost:8787' } }),
      makeEnv(),
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8787');
  });

  it('blocks unknown origin', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/', { headers: { Origin: 'https://evil.com' } }),
      makeEnv(),
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('passes through same-origin (no Origin header)', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/'),
      makeEnv(),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('handles OPTIONS preflight for allowed origin', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' },
      }),
      makeEnv(),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
  });

  it('rejects OPTIONS preflight from unknown origin (no ACAO header)', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/', {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.com' },
      }),
      makeEnv(),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('corsMiddleware — production environment', () => {
  it('allows origin in ALLOWED_ORIGINS whitelist', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/', { headers: { Origin: 'https://app.example.com' } }),
      makeEnv({
        ENVIRONMENT: 'production',
        ALLOWED_ORIGINS: 'https://app.example.com,https://other.example.com',
      }),
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
  });

  it('blocks origin not in whitelist', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/', { headers: { Origin: 'https://evil.com' } }),
      makeEnv({ ENVIRONMENT: 'production', ALLOWED_ORIGINS: 'https://app.example.com' }),
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('blocks all origins when ALLOWED_ORIGINS is empty string', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/', { headers: { Origin: 'https://app.example.com' } }),
      makeEnv({ ENVIRONMENT: 'production', ALLOWED_ORIGINS: '' }),
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('trims whitespace in ALLOWED_ORIGINS entries', async () => {
    const res = await createApp().fetch(
      new Request('http://localhost/', { headers: { Origin: 'https://app.example.com' } }),
      makeEnv({
        ENVIRONMENT: 'production',
        ALLOWED_ORIGINS: '  https://app.example.com  , https://other.example.com ',
      }),
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
  });
});
