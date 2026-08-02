import type {
  LogQuery,
  LogQueryResult,
  LogMetricQuery,
  LogMetricResult,
  ArchiveStats,
  ArchiveQuery,
  ArchiveQueryResult,
} from '@studyops/shared';

const BASE_URL = import.meta.env.VITE_LOG_SERVER_URL ?? '';

async function apiFetch<T>(path: string): Promise<T> {
  const url = BASE_URL ? `${BASE_URL}${path}` : path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(message);
  }

  return res.json();
}

export async function fetchLogs(params: LogQuery = {}): Promise<LogQueryResult> {
  const qs = buildQueryString(params);
  const path = qs ? `/admin/logs?${qs}` : '/admin/logs';
  return apiFetch<LogQueryResult>(path);
}

// GET /admin/logs/metrics — AE 집계 메트릭 (ADR-013).
export async function fetchLogsMetrics(params: LogMetricQuery): Promise<LogMetricResult> {
  const entries: string[] = [`type=${encodeURIComponent(params.type)}`];
  if (params.window) entries.push(`window=${params.window}`);
  if (params.limit != null) entries.push(`limit=${params.limit}`);
  return apiFetch<LogMetricResult>(`/admin/logs/metrics?${entries.join('&')}`);
}

// GET /admin/logs/archive/stats — R2 아카이브 객체 목록 (ADR-014 Phase 4).
export async function fetchArchiveStats(): Promise<ArchiveStats> {
  return apiFetch<ArchiveStats>('/admin/logs/archive/stats');
}

// GET /admin/logs/archive/query — R2 아카이브 JSONL 쿼리 (ADR-014 Phase 4).
export async function fetchArchiveQuery(params: ArchiveQuery = {}): Promise<ArchiveQueryResult> {
  const entries: string[] = [];
  if (params.year != null) entries.push(`year=${params.year}`);
  if (params.month != null) entries.push(`month=${params.month}`);
  if (params.day != null) entries.push(`day=${params.day}`);
  if (params.level) entries.push(`level=${encodeURIComponent(params.level)}`);
  if (params.event) entries.push(`event=${encodeURIComponent(params.event)}`);
  if (params.search) entries.push(`search=${encodeURIComponent(params.search)}`);
  if (params.limit != null) entries.push(`limit=${params.limit}`);
  const path = entries.length > 0 ? `/admin/logs/archive/query?${entries.join('&')}` : '/admin/logs/archive/query';
  return apiFetch<ArchiveQueryResult>(path);
}

function buildQueryString(params: LogQuery): string {
  const entries: string[] = [];
  if (params.level) entries.push(`level=${encodeURIComponent(params.level)}`);
  if (params.source) entries.push(`source=${encodeURIComponent(params.source)}`);
  if (params.event) entries.push(`event=${encodeURIComponent(params.event)}`);
  if (params.userId != null) entries.push(`userId=${params.userId}`);
  if (params.requestId) entries.push(`requestId=${encodeURIComponent(params.requestId)}`);
  if (params.sessionId) entries.push(`sessionId=${encodeURIComponent(params.sessionId)}`);
  if (params.search) entries.push(`search=${encodeURIComponent(params.search)}`);
  if (params.since != null) entries.push(`since=${params.since}`);
  if (params.until != null) entries.push(`until=${params.until}`);
  if (params.cursor) entries.push(`cursor=${encodeURIComponent(params.cursor)}`);
  if (params.limit != null) entries.push(`limit=${params.limit}`);
  return entries.join('&');
}
