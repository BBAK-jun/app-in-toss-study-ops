import { Hono } from 'hono';
import type { AppEnv } from '../../env';
import type { LogQuery, LogRow, LogQueryResult } from '@studyops/shared';
import { buildLogsQuery, encodeCursor } from './logs-query';

export const adminLogRoutes = new Hono<AppEnv>();

adminLogRoutes.get('/', async (c) => {
  const query = c.req.query();
  const filters: LogQuery = {
    level: query.level as LogQuery['level'],
    source: query.source as LogQuery['source'],
    event: query.event as LogQuery['event'],
    userId: query.userId ? Number(query.userId) : undefined,
    requestId: query.requestId,
    sessionId: query.sessionId,
    search: query.search,
    since: query.since ? Number(query.since) : undefined,
    until: query.until ? Number(query.until) : undefined,
    cursor: query.cursor,
    limit: query.limit ? Number(query.limit) : undefined,
  };

  const { sql, params } = buildLogsQuery(filters);
  const stmt = c.env.DB.prepare(sql).bind(...params);
  const { results } = await stmt.all();

  if (!results || results.length === 0) {
    return c.json({ logs: [], nextCursor: null } satisfies LogQueryResult);
  }

  const logs: LogRow[] = results.map((r) => ({
    id: r.id as number,
    ts: r.ts as number,
    level: r.level as LogRow['level'],
    source: r.source as LogRow['source'],
    event: r.event as LogRow['event'],
    message: r.message as string,
    userId: (r.user_id as number | null) ?? null,
    sessionId: (r.session_id as string | null) ?? null,
    requestId: (r.request_id as string | null) ?? null,
    method: (r.method as string | null) ?? null,
    path: (r.path as string | null) ?? null,
    status: (r.status as number | null) ?? null,
    durationMs: (r.duration_ms as number | null) ?? null,
    context: r.context ? (JSON.parse(r.context as string) as Record<string, unknown>) : null,
    stack: (r.stack as string | null) ?? null,
    env: r.env as string,
    version: (r.version as string | null) ?? null,
    userAgent: (r.user_agent as string | null) ?? null,
    ipHash: (r.ip_hash as string | null) ?? null,
  }));

  const last = logs[logs.length - 1];
  const limit = filters.limit ? Math.min(200, Math.max(1, filters.limit)) : 50;
  const nextCursor = logs.length >= limit ? encodeCursor(last.ts, last.id) : null;

  return c.json({ logs, nextCursor } satisfies LogQueryResult);
});
