import type { LogQuery } from '@studyops/shared';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function clampLimit(raw: number | undefined): number {
  if (raw === undefined || Number.isNaN(raw)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(raw)));
}

export function encodeCursor(ts: number, id: number): string {
  return `${ts}:${id}`;
}

export function parseCursor(
  raw: string | undefined,
): { ts: number; id: number } | null {
  if (!raw) return null;
  const parts = raw.split(':');
  if (parts.length !== 2) return null;
  const ts = Number(parts[0]);
  const id = Number(parts[1]);
  if (Number.isNaN(ts) || Number.isNaN(id)) return null;
  return { ts, id };
}

interface BuiltQuery {
  sql: string;
  params: (string | number)[];
}

export function buildLogsQuery(query: LogQuery): BuiltQuery {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (query.level) {
    conditions.push('level = ?');
    params.push(query.level);
  }
  if (query.source) {
    conditions.push('source = ?');
    params.push(query.source);
  }
  if (query.event) {
    conditions.push('event = ?');
    params.push(query.event);
  }
  if (query.userId !== undefined) {
    conditions.push('user_id = ?');
    params.push(query.userId);
  }
  if (query.requestId) {
    conditions.push('request_id = ?');
    params.push(query.requestId);
  }
  if (query.sessionId) {
    conditions.push('session_id = ?');
    params.push(query.sessionId);
  }
  if (query.search) {
    conditions.push('message LIKE ?');
    params.push(`%${query.search}%`);
  }
  if (query.since !== undefined) {
    conditions.push('ts >= ?');
    params.push(query.since);
  }

  const cursor = parseCursor(query.cursor);
  if (cursor) {
    conditions.push('(ts < ? OR (ts = ? AND id < ?))');
    params.push(cursor.ts, cursor.ts, cursor.id);
  } else if (query.until !== undefined) {
    conditions.push('ts < ?');
    params.push(query.until);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = clampLimit(query.limit);

  const sql = `SELECT id, ts, level, source, event, message, user_id, session_id, request_id, method, path, status, duration_ms, context, stack, env, version, user_agent, ip_hash FROM logs ${whereClause} ORDER BY ts DESC, id DESC LIMIT ?`;

  return {
    sql,
    params: [...params, limit],
  };
}
