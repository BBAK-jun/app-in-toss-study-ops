import { apiFetch } from './client';
import type {
  LogQuery,
  LogQueryResult,
  LogMetricQuery,
  LogMetricResult,
  ArchiveStats,
  ArchiveQuery,
  ArchiveQueryResult,
} from '@studyops/shared';

// GET /admin/logs — 로그 대시보드 조회.
// cursor-based pagination, 동적 필터.
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

export async function fetchArchiveStats(): Promise<ArchiveStats> {
  return apiFetch<ArchiveStats>('/admin/logs/archive/stats');
}

export async function fetchArchiveQuery(params: ArchiveQuery = {}): Promise<ArchiveQueryResult> {
  const entries: string[] = [];
  if (params.year != null) entries.push(`year=${params.year}`);
  if (params.month != null) entries.push(`month=${params.month}`);
  if (params.level) entries.push(`level=${encodeURIComponent(params.level)}`);
  if (params.event) entries.push(`event=${encodeURIComponent(params.event)}`);
  if (params.search) entries.push(`search=${encodeURIComponent(params.search)}`);
  if (params.limit != null) entries.push(`limit=${params.limit}`);
  const path = entries.length > 0 ? `/admin/logs/archive/query?${entries.join('&')}` : '/admin/logs/archive/query';
  return apiFetch<ArchiveQueryResult>(path);
}
