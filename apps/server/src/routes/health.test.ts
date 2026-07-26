// 통합 테스트 — SELF.fetch 로 전체 Worker 파이프라인(boot-check → 미들웨어 → 라우트)을 통과.
// D1 binding은 miniflare가 로컬 sqlite로 제공 (wrangler.jsonc 상속).
import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

describe('GET /health', () => {
  it('returns 200 with ok=true and timestamp', async () => {
    const res = await SELF.fetch('http://localhost/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; ts: number };
    expect(body.ok).toBe(true);
    expect(typeof body.ts).toBe('number');
    expect(body.ts).toBeGreaterThan(0);
  });

  it('does not require Authorization header', async () => {
    const res = await SELF.fetch('http://localhost/health');
    expect(res.status).toBe(200);
  });
});

describe('GET /ready', () => {
  it('returns 200 when DB is reachable and env is configured', async () => {
    const res = await SELF.fetch('http://localhost/ready');
    const body = (await res.json()) as {
      ok: boolean;
      checks: Record<string, { ok: boolean; detail?: string }>;
      ts: number;
    };

    // miniflare D1 sqlite 가 정상이어야 db check 통과
    expect(body.checks.db.ok).toBe(true);
    expect(body.checks.environment.ok).toBe(true);
    expect(body.checks.sessionSecret.ok).toBe(true);

    // dev 환경에서는 mcpApiToken check가 생략됨 (prod 전용)
    expect(body.checks).not.toHaveProperty('mcpApiToken');

    expect(body.ok).toBe(true);
    expect(res.status).toBe(200);
  });

  it('executes a real D1 query (SELECT 1)', async () => {
    // /ready 가 DB check 로 SELECT 1을 실행 — 응답 ok=true 로 간접 검증.
    // 직접 D1을 테스트하려면 env.DB를 import 해야 하지만, /ready 라우트가
    // 동일한 binding을 사용하므로 여기서 간접 검증으로 충분.
    const res = await SELF.fetch('http://localhost/ready');
    const body = (await res.json()) as { checks: { db: { ok: boolean; detail?: string } } };
    expect(body.checks.db.ok).toBe(true);
    expect(body.checks.db.detail).toBeUndefined();
  });
});
