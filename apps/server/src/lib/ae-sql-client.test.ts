// ae-sql-client.ts + logs-metrics.ts SQL 빌더 단위 테스트.
// vitest 인프라 이슈로 node:test로 검증 — 같은 import 경로 사용.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  queryAnalyticsEngine,
  AnalyticsEngineError,
} from '/Users/sondi/orca/workspaces/app-intoss-study-workspace/log-olap/apps/server/src/lib/ae-sql-client.ts';
import {
  __test,
} from '/Users/sondi/orca/workspaces/app-intoss-study-workspace/log-olap/apps/server/src/routes/admin/logs-metrics.ts';

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
    assert.ok(sql.includes("INTERVAL '1' HOUR"), 'has 1h interval');
    assert.ok(sql.includes("blob3 = 'production'"), 'has production env filter');
    assert.ok(sql.includes('GROUP BY event'), 'groups by event');
    assert.ok(sql.includes('error_count'), 'computes error_count');
    assert.ok(sql.includes('total_count'), 'computes total_count');
  });

  it('buildTopEventsSql applies LIMIT and ORDER BY count DESC', () => {
    const sql = buildTopEventsSql('7d', 'dev', 10);
    assert.ok(sql.includes("INTERVAL '7' DAY"));
    assert.ok(sql.includes('LIMIT 10'));
    assert.ok(sql.includes('ORDER BY count DESC'));
    assert.ok(sql.includes("blob3 = 'dev'"));
  });

  it('buildP95Sql filters out empty path and zero duration', () => {
    const sql = buildP95Sql('24h', 'production', 20);
    assert.ok(sql.includes('quantile(0.95)'));
    assert.ok(sql.includes("blob4 != ''"), 'excludes empty path');
    assert.ok(sql.includes('double2 > 0'), 'excludes zero duration');
    assert.ok(sql.includes('LIMIT 20'));
  });

  it('buildTimeseriesSql uses hourly buckets for short windows', () => {
    const sql1h = buildTimeseriesSql('1h', 'dev');
    assert.ok(sql1h.includes('toStartOfHour'));
    const sql6h = buildTimeseriesSql('6h', 'dev');
    assert.ok(sql6h.includes('toStartOfHour'));
  });

  it('buildTimeseriesSql uses daily buckets for 24h+ windows', () => {
    const sql = buildTimeseriesSql('30d', 'dev');
    assert.ok(sql.includes('toStartOfDay'));
    assert.ok(!sql.includes('toStartOfHour'));
  });

  it('windowToInterval maps h → HOUR, d → DAY', () => {
    assert.equal(windowToInterval('1h'), "INTERVAL '1' HOUR");
    assert.equal(windowToInterval('6h'), "INTERVAL '6' HOUR");
    assert.equal(windowToInterval('7d'), "INTERVAL '7' DAY");
    assert.equal(windowToInterval('30d'), "INTERVAL '30' DAY");
  });

  it('ALLOWED_WINDOWS includes common defaults', () => {
    assert.ok(ALLOWED_WINDOWS.has('1h'));
    assert.ok(ALLOWED_WINDOWS.has('24h'));
    assert.ok(ALLOWED_WINDOWS.has('7d'));
    assert.ok(ALLOWED_WINDOWS.has('30d'));
  });
});

// ─── 캐시 ──────────────────────────────────────────────────────────────────
describe('in-memory cache', () => {
  it('setCached then getCached returns rows', () => {
    setCached('test-key', [{ a: 1 }]);
    assert.deepEqual(getCached('test-key'), [{ a: 1 }]);
    cache.delete('test-key');
  });

  it('getCached returns null for missing key', () => {
    assert.equal(getCached('does-not-exist'), null);
  });
});

// ─── queryAnalyticsEngine (fetch mock) ─────────────────────────────────────
describe('queryAnalyticsEngine', () => {
  it('throws AnalyticsEngineError when accountId empty', async () => {
    await assert.rejects(
      () => queryAnalyticsEngine({ accountId: '', apiToken: 'tok', sql: 'SELECT 1' }),
      (err: unknown) => {
        assert.ok(err instanceof AnalyticsEngineError);
        assert.equal((err as AnalyticsEngineError).status, 503);
        return true;
      },
    );
  });

  it('throws AnalyticsEngineError when apiToken empty', async () => {
    await assert.rejects(
      () => queryAnalyticsEngine({ accountId: 'acct', apiToken: '', sql: 'SELECT 1' }),
      (err: unknown) => {
        assert.ok(err instanceof AnalyticsEngineError);
        assert.equal((err as AnalyticsEngineError).status, 503);
        return true;
      },
    );
  });

  it('parses successful response data array', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: URL | string, init?: RequestInit) => {
      assert.ok(typeof init?.body === 'string');
      assert.ok((init?.headers as Record<string, string>)?.Authorization?.startsWith('Bearer '));
      return new Response(JSON.stringify({
        success: true,
        result: { data: [{ event: 'study.created', count: 42 }], meta: {} },
        errors: [],
        messages: [],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    try {
      const rows = await queryAnalyticsEngine({
        accountId: 'acct', apiToken: 'tok', sql: 'SELECT 1',
      });
      assert.deepEqual(rows, [{ event: 'study.created', count: 42 }]);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('throws when AE returns success: false', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({
        success: false,
        result: null,
        errors: [{ code: 700001, message: 'invalid SQL' }],
        messages: [],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    ) as typeof fetch;

    try {
      await assert.rejects(
        () => queryAnalyticsEngine({ accountId: 'acct', apiToken: 'tok', sql: 'bad sql' }),
        (err: unknown) => {
          assert.ok(err instanceof AnalyticsEngineError);
          assert.match((err as Error).message, /invalid SQL/);
          return true;
        },
      );
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('throws on HTTP 401', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response('unauthorized', { status: 401 })
    ) as typeof fetch;
    try {
      await assert.rejects(
        () => queryAnalyticsEngine({ accountId: 'acct', apiToken: 'bad', sql: 'SELECT 1' }),
        (err: unknown) => {
          assert.ok(err instanceof AnalyticsEngineError);
          assert.equal((err as AnalyticsEngineError).status, 502);
          return true;
        },
      );
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('throws on network failure (fetch rejects)', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('ECONNRESET');
    }) as typeof fetch;
    try {
      await assert.rejects(
        () => queryAnalyticsEngine({ accountId: 'acct', apiToken: 'tok', sql: 'SELECT 1' }),
        (err: unknown) => {
          assert.ok(err instanceof AnalyticsEngineError);
          assert.equal((err as AnalyticsEngineError).status, 502);
          assert.match((err as Error).message, /ECONNRESET/);
          return true;
        },
      );
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
