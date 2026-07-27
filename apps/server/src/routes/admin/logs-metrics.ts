// 관리자 메트릭 엔드포인트 — ADR-013 Phase 3.
//
// AE SQL API로 집계 메트릭을 쿼리. D1 fallback 없이 AE만 조회 — D1의 row-store
// 집계 한계를 보완하는 것이 본 라우트의 존재 이유.
//
// 4개 메트릭 타입:
//   GET /metrics?type=error_rate&window=1h     — error/(error+info+warn) by event
//   GET /metrics?type=top_events&window=7d&limit=10
//   GET /metrics?type=p95_duration&window=24h  — path별 duration p95
//   GET /metrics?type=timeseries&window=30d    — 일별 레벨별 count
//
// 응답 캐싱: 30s in-memory. AE 샘플링 + 수집 지연(수분) 때문에 더 짧은 캐시는 의미 X.

import { Hono } from 'hono';
import type { AppEnv } from '../../env';
import { HttpError } from '../../lib/http-error';
import { queryAnalyticsEngine, AnalyticsEngineError } from '../../lib/ae-sql-client';
import type { AeQueryResultRow } from '../../lib/ae-sql-client';

export const adminLogMetricsRoutes = new Hono<AppEnv>();

// ─── 캐시 (30s in-memory) ──────────────────────────────────────────────────
interface CacheEntry {
  rows: AeQueryResultRow[];
  expiresAt: number;
}
const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

function getCached(key: string): AeQueryResultRow[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.rows;
}

function setCached(key: string, rows: AeQueryResultRow[]): void {
  cache.set(key, { rows, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── SQL 빌더 ──────────────────────────────────────────────────────────────
// AE SQL dialect (ClickHouse-flavored). blob1=level, blob3=env, blob4=path,
// double2=durationMs, double4=count_weight, index1=event.
// _sample_interval은 AE 자동 필드 — SUM(double4 * _sample_interval)로 보정 count 산출.

const ALLOWED_WINDOWS = new Set(['1h', '6h', '24h', '7d', '30d']);

function assertWindow(raw: string | undefined): string {
  if (!raw || !ALLOWED_WINDOWS.has(raw)) {
    throw new HttpError(400, 'VALIDATION_ERROR', `window must be one of: ${[...ALLOWED_WINDOWS].join(', ')}`);
  }
  return raw;
}

function windowToInterval(window: string): string {
  // AE SQL accepts INTERVAL 'N' UNIT syntax.
  const match = window.match(/^(\d+)([hd])$/);
  if (!match) throw new HttpError(400, 'VALIDATION_ERROR', `bad window: ${window}`);
  const [, n, unit] = match;
  const unitWord = unit === 'h' ? 'HOUR' : 'DAY';
  return `INTERVAL '${n}' ${unitWord}`;
}

function envFilter(env: 'dev' | 'production'): string {
  return `blob3 = '${env}'`;
}

function buildErrorRateSql(window: string, env: 'dev' | 'production'): string {
  return `
    SELECT index1 AS event,
      SUM(if(blob1 = 'error' OR blob1 = 'fatal', double4 * _sample_interval, 0)) AS error_count,
      SUM(double4 * _sample_interval) AS total_count
    FROM studyops_logs
    WHERE timestamp > NOW() - ${windowToInterval(window)}
      AND ${envFilter(env)}
    GROUP BY event
    ORDER BY error_count DESC
  `;
}

function buildTopEventsSql(window: string, env: 'dev' | 'production', limit: number): string {
  return `
    SELECT index1 AS event, SUM(double4 * _sample_interval) AS count
    FROM studyops_logs
    WHERE timestamp > NOW() - ${windowToInterval(window)}
      AND ${envFilter(env)}
    GROUP BY event
    ORDER BY count DESC
    LIMIT ${limit}
  `;
}

function buildP95Sql(window: string, env: 'dev' | 'production', limit: number): string {
  return `
    SELECT blob4 AS path,
      quantile(0.95)(double2 * 1) AS p95_duration_ms,
      SUM(double4 * _sample_interval) AS sample_count
    FROM studyops_logs
    WHERE timestamp > NOW() - ${windowToInterval(window)}
      AND ${envFilter(env)}
      AND blob4 != ''
      AND double2 > 0
    GROUP BY path
    ORDER BY p95_duration_ms DESC
    LIMIT ${limit}
  `;
}

function buildTimeseriesSql(window: string, env: 'dev' | 'production'): string {
  // 1h/6h → 시간 버킷, 24h+ → 일 버킷.
  const bucketFn = window === '1h' || window === '6h'
    ? 'toStartOfHour(timestamp)'
    : 'toStartOfDay(timestamp)';
  return `
    SELECT ${bucketFn} AS bucket, blob1 AS level,
      SUM(double4 * _sample_interval) AS count
    FROM studyops_logs
    WHERE timestamp > NOW() - ${windowToInterval(window)}
      AND ${envFilter(env)}
    GROUP BY bucket, level
    ORDER BY bucket, level
  `;
}

// ─── 카디널리티 진단 (ADR-013 Open Question #1) ────────────────────────────
// userId(blob7) 가 equitable sampling 에 미치는 영향을 점검하기 위한 진단 쿼리.
// 운영자가 직접 AE SQL API 또는 admin 터미널에서 실행. 엔드포인트 노출은 Phase 4+.
//
// 판단 기준 (경험적):
//   - distinct_users / total_rows > 0.5 → 고카디널리티 경고. 별도 dataset 분리 검토.
//   - top_user_ratio (TOP 1 user / total) < 0.01 → long-tail 분포. 분리 효과 미미.
//
// 실행 예:
//   wrangler dev --local 실행 후 별도 AE SQL API 클라이언트로 아래 쿼리 POST.
const CARDINALITY_DIAGNOSTIC_SQL = `
  SELECT
    COUNT(DISTINCT blob7) AS distinct_users,
    SUM(_sample_interval) AS total_rows,
    COUNT(DISTINCT blob7) * 1.0 / SUM(_sample_interval) AS cardinality_ratio,
    max_per_user AS top_user_count,
    max_per_user * 1.0 / SUM(_sample_interval) AS top_user_ratio
  FROM studyops_logs
  ARRAY JOIN (
    SELECT max(c) AS max_per_user
    FROM (
      SELECT blob7, SUM(_sample_interval) AS c
      FROM studyops_logs
      WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob7 != ''
      GROUP BY blob7
    )
  )
  WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob7 != ''
`;

// ─── 라우트 ────────────────────────────────────────────────────────────────
adminLogMetricsRoutes.get('/metrics', async (c) => {
  const type = c.req.query('type');
  const window = assertWindow(c.req.query('window') ?? '24h');
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? '10')));
  const env = c.env.ENVIRONMENT === 'production' ? 'production' : 'dev';

  if (!type) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'type required: error_rate | top_events | p95_duration | timeseries');
  }

  let sql: string;
  switch (type) {
    case 'error_rate':
      sql = buildErrorRateSql(window, env);
      break;
    case 'top_events':
      sql = buildTopEventsSql(window, env, limit);
      break;
    case 'p95_duration':
      sql = buildP95Sql(window, env, limit);
      break;
    case 'timeseries':
      sql = buildTimeseriesSql(window, env);
      break;
    default:
      throw new HttpError(400, 'VALIDATION_ERROR', `unknown type: ${type}`);
  }

  const cacheKey = `${env}:${type}:${window}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return c.json({
      type, window, env, limit, cached: true, rows: cached,
    });
  }

  try {
    const rows = await queryAnalyticsEngine({
      accountId: c.env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: c.env.CF_API_TOKEN ?? '',
      sql,
    });
    setCached(cacheKey, rows);
    return c.json({ type, window, env, limit, cached: false, rows });
  } catch (err) {
    if (err instanceof AnalyticsEngineError) {
      // 503 = 미설정 (CF_API_TOKEN/ACCOUNT_ID), 502 = AE API 실패.
      throw new HttpError(err.status, 'ANALYTICS_ENGINE_ERROR', err.message);
    }
    throw err;
  }
});

// Export internal helpers for unit tests + diagnostic SQL.
export const __test = {
  buildErrorRateSql,
  buildTopEventsSql,
  buildP95Sql,
  buildTimeseriesSql,
  windowToInterval,
  getCached,
  setCached,
  cache,
  CACHE_TTL_MS,
  ALLOWED_WINDOWS,
  CARDINALITY_DIAGNOSTIC_SQL,
};
