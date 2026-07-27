// ae-sql-client.ts + logs-metrics.ts SQL 빌더 단위 테스트.
//
// vitest 런타임이 현재 infra 에러로 실행 불가 — 로직 검증은 별도 tsx 스크립트로 수행.
// vitest 복원시 본 파일이 정상 실행됨.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  queryAnalyticsEngine,
  AnalyticsEngineError,
} from './ae-sql-client';
import { __test } from '../routes/admin/logs-metrics';

const {
  buildErrorRateSql,
  buildTopEventsSql,
  buildP95Sql,
  buildTimeseriesSql,
  windowToInterval,
  getCached,
  setCached,
  cache,
  ALLOWED_WINDOWS,
} = __test;

// ─── SQL 빌더 ──────────────────────────────────────────────────────────────
describe('SQL builders', () => {
  it('buildErrorRateSql includes interval + env filter + GROUP BY event', () => {
    const sql = buildErrorRateSql('1h', 'production');
    expect(sql).toContain("INTERVAL '1' HOUR");
    expect(sql).toContain("blob3 = 'production'");
    expect(sql).toContain('GROUP BY event');
    expect(sql).toContain('error_count');
    expect(sql).toContain('total_count');
  });

  it('buildTopEventsSql applies LIMIT and ORDER BY count DESC', () => {
    const sql = buildTopEventsSql('7d', 'dev', 10);
    expect(sql).toContain("INTERVAL '7' DAY");
    expect(sql).toContain('LIMIT 10');
    expect(sql).toContain('ORDER BY count DESC');
    expect(sql).toContain("blob3 = 'dev'");
  });

  it('buildP95Sql filters out empty path and zero duration', () => {
    const sql = buildP95Sql('24h', 'production', 20);
    expect(sql).toContain('quantile(0.95)');
    expect(sql).toContain("blob4 != ''");
    expect(sql).toContain('double2 > 0');
    expect(sql).toContain('LIMIT 20');
  });

  it('buildTimeseriesSql uses hourly buckets for short windows', () => {
    expect(buildTimeseriesSql('1h', 'dev')).toContain('toStartOfHour');
    expect(buildTimeseriesSql('6h', 'dev')).toContain('toStartOfHour');
  });

  it('buildTimeseriesSql uses daily buckets for 24h+ windows', () => {
    const sql = buildTimeseriesSql('30d', 'dev');
    expect(sql).toContain('toStartOfDay');
    expect(sql).not.toContain('toStartOfHour');
  });

  it('windowToInterval maps h → HOUR, d → DAY', () => {
    expect(windowToInterval('1h')).toBe("INTERVAL '1' HOUR");
    expect(windowToInterval('6h')).toBe("INTERVAL '6' HOUR");
    expect(windowToInterval('7d')).toBe("INTERVAL '7' DAY");
    expect(windowToInterval('30d')).toBe("INTERVAL '30' DAY");
  });

  it('ALLOWED_WINDOWS includes common defaults', () => {
    expect(ALLOWED_WINDOWS.has('1h')).toBe(true);
    expect(ALLOWED_WINDOWS.has('24h')).toBe(true);
    expect(ALLOWED_WINDOWS.has('7d')).toBe(true);
    expect(ALLOWED_WINDOWS.has('30d')).toBe(true);
  });
});

// ─── 캐시 ──────────────────────────────────────────────────────────────────
describe('in-memory cache', () => {
  beforeEach(() => { cache.clear(); });

  it('setCached then getCached returns rows', () => {
    setCached('test-key', [{ a: 1 }]);
    expect(getCached('test-key')).toEqual([{ a: 1 }]);
  });

  it('getCached returns null for missing key', () => {
    expect(getCached('does-not-exist')).toBeNull();
  });
});

// ─── queryAnalyticsEngine (fetch mock) ─────────────────────────────────────
describe('queryAnalyticsEngine', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = origFetch; });

  it('throws AnalyticsEngineError when accountId empty', async () => {
    await expect(
      queryAnalyticsEngine({ accountId: '', apiToken: 'tok', sql: 'SELECT 1' }),
    ).rejects.toMatchObject({ name: 'AnalyticsEngineError', status: 503 });
  });

  it('throws AnalyticsEngineError when apiToken empty', async () => {
    await expect(
      queryAnalyticsEngine({ accountId: 'acct', apiToken: '', sql: 'SELECT 1' }),
    ).rejects.toMatchObject({ name: 'AnalyticsEngineError', status: 503 });
  });

  it('parses successful response data array', async () => {
    globalThis.fetch = vi.fn(async (_url, init?: RequestInit) => {
      expect(typeof init?.body).toBe('string');
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toMatch(/^Bearer /);
      return new Response(JSON.stringify({
        success: true,
        result: { data: [{ event: 'study.created', count: 42 }], meta: {} },
        errors: [],
        messages: [],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as unknown as typeof fetch;

    const rows = await queryAnalyticsEngine({
      accountId: 'acct', apiToken: 'tok', sql: 'SELECT 1',
    });
    expect(rows).toEqual([{ event: 'study.created', count: 42 }]);
  });

  it('throws when AE returns success: false', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({
        success: false,
        result: null,
        errors: [{ code: 700001, message: 'invalid SQL' }],
        messages: [],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    ) as unknown as typeof fetch;

    await expect(
      queryAnalyticsEngine({ accountId: 'acct', apiToken: 'tok', sql: 'bad sql' }),
    ).rejects.toMatchObject({
      name: 'AnalyticsEngineError',
      message: expect.stringMatching(/invalid SQL/),
    });
  });

  it('throws on HTTP 401', async () => {
    globalThis.fetch = vi.fn(async () => new Response('unauthorized', { status: 401 })) as unknown as typeof fetch;
    await expect(
      queryAnalyticsEngine({ accountId: 'acct', apiToken: 'bad', sql: 'SELECT 1' }),
    ).rejects.toMatchObject({ name: 'AnalyticsEngineError', status: 502 });
  });

  it('throws on network failure (fetch rejects)', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('ECONNRESET'); }) as unknown as typeof fetch;
    await expect(
      queryAnalyticsEngine({ accountId: 'acct', apiToken: 'tok', sql: 'SELECT 1' }),
    ).rejects.toMatchObject({
      name: 'AnalyticsEngineError',
      status: 502,
      message: expect.stringMatching(/ECONNRESET/),
    });
  });
});
