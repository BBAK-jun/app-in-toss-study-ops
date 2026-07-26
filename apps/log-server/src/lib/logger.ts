import type { Context } from 'hono';
import type { LogLevel, LogEntry, LogSource, LogEvent } from '@studyops/shared';
import { LOG_SAMPLING_RATE, LOG_LEVEL_WEIGHT } from '@studyops/shared';
import type { AppEnv } from '../env';

export interface LogEntryInput {
  level: LogLevel;
  event: LogEvent;
  message: string;
  source?: LogSource;
  userId?: number | null;
  sessionId?: string;
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  context?: Record<string, unknown>;
  stack?: string;
  version?: string;
  userAgent?: string;
  ipHash?: string;
  forceSample?: boolean;
}

export interface LogContext {
  db: D1Database;
  executionCtx: { waitUntil(promise: Promise<unknown>): void };
  env: 'dev' | 'production';
  requestId?: string;
  discordWebhookDefault?: string;
  appVersion?: string;
}

export function buildLogContext(c: Context<AppEnv>): LogContext {
  return {
    db: c.env.DB,
    executionCtx: c.executionCtx,
    env: c.env.ENVIRONMENT === 'production' ? 'production' : 'dev',
    requestId: c.get('requestId'),
  };
}

export function log(c: Context<AppEnv>, input: LogEntryInput): void {
  logWithContext(buildLogContext(c), input);
}

export function logWithContext(ctx: LogContext, input: LogEntryInput): void {
  const sanitizedContext = sanitizeContext(input.context);

  const entry: LogEntry = {
    ts: Date.now(),
    source: input.source ?? 'server',
    level: input.level,
    event: input.event,
    message: input.message,
    userId: input.userId !== undefined ? input.userId : null,
    sessionId: input.sessionId,
    requestId: input.requestId ?? ctx.requestId,
    method: input.method,
    path: input.path,
    status: input.status,
    durationMs: input.durationMs,
    context: sanitizedContext ?? undefined,
    stack: input.stack,
    env: ctx.env,
    version: input.version ?? ctx.appVersion,
    userAgent: input.userAgent,
    ipHash: input.ipHash,
    forceSample: input.forceSample,
  };

  const consoleFn =
    entry.level === 'error' || entry.level === 'fatal'
      ? 'error'
      : entry.level === 'warn'
        ? 'warn'
        : 'log';
  console[consoleFn](JSON.stringify(entry));

  if (shouldSample(entry, ctx.env)) {
    ctx.executionCtx.waitUntil(
      insertLog(ctx.db, entry).catch((err: unknown) => {
        console.error(
          JSON.stringify({
            level: 'error',
            event: 'log.persistence_failed',
            message: 'Failed to persist log to D1',
            originalEvent: entry.event,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }),
    );
  }
}

export function shouldSample(
  entry: Pick<LogEntry, 'level' | 'event' | 'message' | 'ts' | 'forceSample'>,
  env: 'dev' | 'production',
): boolean {
  if (env === 'dev') return true;
  if (entry.forceSample) return true;

  const rate = LOG_SAMPLING_RATE[entry.level];
  if (rate >= 1) return true;
  if (rate <= 0) return false;

  const hash = hashString(`${entry.event}|${entry.ts}|${entry.message}`);
  return (hash % 10000) / 10000 < rate;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const ALLOWED_CONTEXT_KEYS = new Set<string>([
  'studyId', 'roundId', 'submissionId', 'participantId',
  'ownerId', 'userKey', 'userId', 'studyIdList',
  'title', 'roundNumber', 'description', 'participantCount',
  'rate', 'submittedCount', 'total', 'notSubmittedHandles',
  'dueAt', 'delayMinutes',
  'durationMs', 'sqlHash', 'queryCount', 'endpoint', 'method',
  'path', 'status', 'code', 'errorCode', 'errorName',
  'version', 'jobName', 'migrationsCount', 'cronTrigger',
  'violation', 'rateLimit', 'remaining', 'reset', 'authMode',
  'environment', 'tossApiBase',
  'requestId', 'sessionId', 'cfRay', 'component', 'componentStack',
  'stack', 'source', 'referrer', 'url', 'urlLength', 'line', 'col',
  'tool', 'argsShape', 'resultShape',
  'details', 'extra',
  'dropped', 'queueSize', 'attemptCount', 'inserted', 'deleted',
]);

export function sanitizeContext(
  context: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  if (!context || typeof context !== 'object') return null;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(context)) {
    if (!ALLOWED_CONTEXT_KEYS.has(k)) {
      out[k] = '[REDACTED]';
      continue;
    }
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitizeContext(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const INSERT_SQL = `INSERT INTO logs (
  ts, level, source, event, message,
  user_id, session_id, request_id,
  method, path, status, duration_ms,
  context, stack, env, version, user_agent, ip_hash
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export async function insertLog(db: D1Database, entry: LogEntry): Promise<void> {
  await db
    .prepare(INSERT_SQL)
    .bind(
      entry.ts, entry.level, entry.source, entry.event, entry.message,
      entry.userId ?? null, entry.sessionId ?? null, entry.requestId ?? null,
      entry.method ?? null, entry.path ?? null, entry.status ?? null,
      entry.durationMs ?? null,
      entry.context ? JSON.stringify(entry.context) : null,
      entry.stack ?? null, entry.env ?? 'dev', entry.version ?? null,
      entry.userAgent ?? null, entry.ipHash ?? null,
    )
    .run();
}

export async function insertLogBatch(
  db: D1Database,
  entries: LogEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  const stmts = entries.map((entry) =>
    db.prepare(INSERT_SQL).bind(
      entry.ts, entry.level, entry.source, entry.event, entry.message,
      entry.userId ?? null, entry.sessionId ?? null, entry.requestId ?? null,
      entry.method ?? null, entry.path ?? null, entry.status ?? null,
      entry.durationMs ?? null,
      entry.context ? JSON.stringify(entry.context) : null,
      entry.stack ?? null, entry.env ?? 'dev', entry.version ?? null,
      entry.userAgent ?? null, entry.ipHash ?? null,
    ),
  );
  await db.batch(stmts);
}

export function levelGte(a: LogLevel, b: LogLevel): boolean {
  return LOG_LEVEL_WEIGHT[a] >= LOG_LEVEL_WEIGHT[b];
}
