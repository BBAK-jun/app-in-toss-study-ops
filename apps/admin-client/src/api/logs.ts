import type { LogQuery, LogQueryResult } from '@studyops/shared';

const BASE_URL = import.meta.env.VITE_LOG_SERVER_URL ?? '';

export async function fetchLogs(params: LogQuery = {}): Promise<LogQueryResult> {
  const qs = buildQueryString(params);
  const path = qs ? `/admin/logs?${qs}` : '/admin/logs';
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
