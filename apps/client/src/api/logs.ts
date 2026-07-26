import { apiFetch } from './client';
import type { LogQuery, LogQueryResult } from '@studyops/shared';

// GET /admin/logs — 로그 대시보드 조회.
// cursor-based pagination, 동적 필터.
export async function fetchLogs(params: LogQuery = {}): Promise<LogQueryResult> {
  const qs = buildQueryString(params);
  const path = qs ? `/admin/logs?${qs}` : '/admin/logs';
  return apiFetch<LogQueryResult>(path);
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
