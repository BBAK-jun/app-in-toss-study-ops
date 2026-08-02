// Cloudflare Analytics Engine SQL API 클라이언트 — ADR-013 Phase 3.
//
// Worker 내부에서 AE dataset을 쿼리하기 위한 fetch 래퍼. 대시보드 메트릭
// 엔드포인트가 사용. SQL은 AE 전용 문법 (Houdini/TZTime — 표준 SQL과 약간 다름).
//
// 인증: Bearer CF_API_TOKEN secret. 권한은 "Account Analytics: Read" 최소.
// 응답: 표준 CF API envelope { result: { data: [...], meta }, success, errors, messages }.
//
// 에러 처리: 인증/네트워크 실패시 AnalyticsEngineError throw. 라우트에서 502/503 매핑.
//
// 참조: https://developers.cloudflare.com/analytics/analytics-engine/sql-api/

export interface AnalyticsEngineErrorShape {
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}

export class AnalyticsEngineError extends Error {
  readonly status: number;
  readonly cause?: unknown;
  constructor(message: string, status = 500, cause?: unknown) {
    super(message);
    this.name = 'AnalyticsEngineError';
    this.status = status;
    this.cause = cause;
  }
}

export interface AeQueryResultRow {
  [column: string]: string | number | null | undefined;
}

interface AeResponseOk {
  success: true;
  result: { data: AeQueryResultRow[]; meta: unknown };
  errors: [];
  messages: unknown[];
}

interface AeResponseErr {
  success: false;
  result: null;
  errors: { code: number; message: string }[];
  messages: unknown[];
}

const AE_SQL_ENDPOINT = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`;

export async function queryAnalyticsEngine(params: {
  accountId: string;
  apiToken: string;
  sql: string;
  signal?: AbortSignal;
}): Promise<AeQueryResultRow[]> {
  const { accountId, apiToken, sql, signal } = params;

  if (!accountId) {
    throw new AnalyticsEngineError('CLOUDFLARE_ACCOUNT_ID not configured', 503);
  }
  if (!apiToken) {
    throw new AnalyticsEngineError('CF_API_TOKEN not configured', 503);
  }

  let res: Response;
  try {
    res = await fetch(AE_SQL_ENDPOINT(accountId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: sql,
      signal,
    });
  } catch (err) {
    throw new AnalyticsEngineError(
      `AE SQL fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      502,
      err,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AnalyticsEngineError(
      `AE SQL HTTP ${res.status}: ${body.slice(0, 500)}`,
      res.status === 401 || res.status === 403 ? 502 : 502,
    );
  }

  const json = (await res.json().catch(() => null)) as AeResponseOk | AeResponseErr | null;
  if (!json) {
    throw new AnalyticsEngineError('AE SQL response not JSON', 502);
  }
  if (!json.success || !json.result) {
    const msg = json.errors?.[0]?.message ?? 'unknown AE error';
    throw new AnalyticsEngineError(`AE SQL error: ${msg}`, 502);
  }
  return json.result.data;
}
