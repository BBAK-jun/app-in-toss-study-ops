// 클라이언트 로그 수집 라우트 — POST /logs (authMiddleware 통과 후 마운트).
//
// 클라이언트가 batch로 모은 로그를 수신 → 검증 → AE write + D1 batch INSERT.
// 202 Accepted 반환 (비동기 처리의 의미론적 표현).
//
// ADR-011: D1 writes/day 한도 보호를 위해 100 entries/batch 제한.
// ADR-013: AE는 샘플링 없이 전수 적재 (Tier 2).

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { HttpError } from '../lib/http-error';
import { insertLogBatch } from '../lib/logger';
import { writeLogDataPoints } from '../lib/analytics';
import type { LogEntry, LogBatchPayload, LogEvent, LogLevel, LogSource } from '@studyops/shared';
import {
  LOG_EVENTS,
} from '@studyops/shared';

const MAX_BATCH_SIZE = 100;

const VALID_LEVELS = new Set<string>(['debug', 'info', 'warn', 'error', 'fatal']);
const VALID_SOURCES = new Set<string>(['client', 'server', 'cron', 'mcp']);
const VALID_EVENTS = new Set<string>(Object.values(LOG_EVENTS));

export const logRoutes = new Hono<AppEnv>();

logRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid JSON body');
  }

  const payload = body as Partial<LogBatchPayload>;
  const entries = payload.entries;
  const client = payload.client;

  if (!Array.isArray(entries)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'entries must be an array');
  }
  if (entries.length > MAX_BATCH_SIZE) {
    throw new HttpError(413, 'VALIDATION_ERROR', `Max ${MAX_BATCH_SIZE} entries per batch`);
  }
  if (!client || typeof client.sessionId !== 'string' || typeof client.userAgent !== 'string') {
    throw new HttpError(400, 'VALIDATION_ERROR', 'client.sessionId and client.userAgent are required');
  }

  if (entries.length === 0) {
    return c.json({ accepted: 0 }, 202);
  }

  const userKey = c.get('user')?.userKey ?? null;
  const mergedUserId = client.userId ?? userKey;

  const validated: LogEntry[] = [];
  for (const raw of entries) {
    if (!raw || typeof raw !== 'object') continue;
    if (!VALID_LEVELS.has(raw.level as string)) continue;
    if (!VALID_SOURCES.has(raw.source as string)) continue;
    if (!VALID_EVENTS.has(raw.event as string)) continue;
    if (typeof raw.message !== 'string') continue;
    if (typeof raw.ts !== 'number') continue;

    validated.push({
      ts: raw.ts,
      level: raw.level as LogLevel,
      source: raw.source as LogSource,
      event: raw.event as LogEvent,
      message: raw.message,
      userId: mergedUserId,
      sessionId: client.sessionId,
      requestId: raw.requestId,
      method: raw.method,
      path: raw.path,
      status: raw.status,
      durationMs: raw.durationMs,
      context: raw.context,
      stack: raw.stack,
      env: c.env.ENVIRONMENT === 'production' ? 'production' : 'dev',
      version: client.version ?? raw.version,
      userAgent: client.userAgent,
    });
  }

  // Tier 2: AE — 샘플링 없이 전수. non-blocking (ADR-013).
  writeLogDataPoints(c.env.LOGS_ANALYTICS, validated);

  // Tier 3: D1 batch INSERT — waitUntil로 비동기.
  c.executionCtx.waitUntil(
    insertLogBatch(c.env.DB, validated).catch((err: unknown) => {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'log.persistence_failed',
          message: 'Failed to persist client log batch to D1',
          error: err instanceof Error ? err.message : String(err),
          attempted: validated.length,
        }),
      );
    }),
  );

  return c.json({ accepted: validated.length }, 202);
});
