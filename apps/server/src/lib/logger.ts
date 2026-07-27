// 서버 로거 — ADR-011 + ADR-013 4계층 로깅.
//
//   Tier 1: console.log                       → Workers Logs (3일, 무료)
//   Tier 2: env.LOGS_ANALYTICS.writeDataPoint → AE (항상, 샘플링 없이 — ADR-013)
//   Tier 3: ctx.waitUntil(insertLog)          → D1 (샘플링 유지, 상세/검색용)
//   Tier 4: error/fatal → Discord webhook
//
// 사용법:
//   import { log } from '../lib/logger';
//   log(c, { level: 'info', event: LOG_EVENTS.STUDY_CREATED, message: '...', context: {...} });
//
// 설계:
// - Tier 1(console)은 항상 실행 — Workers Logs에 3일 보관.
// - Tier 2(AE)도 항상 실행 — 샘플링 없이. non-blocking.
// - Tier 3(D1)는 샘플링 통과시 executionCtx.waitUntil로 비동기 INSERT. 응답 블록 X.
// - error/fatal은 Discord webhook으로 전송 (DISCORD_WEBHOOK_DEFAULT가 있을 때).
// - PII sanitize: 화이트리스트 기반. 허용되지 않은 context 키는 [REDACTED] 치환.

import type { Context } from 'hono';
import type {
  LogLevel,
  LogEntry,
  LogSource,
  LogEvent,
} from '@studyops/shared';
import {
  LOG_SAMPLING_RATE,
  LOG_LEVEL_WEIGHT,
} from '@studyops/shared';
import type { AppEnv } from '../env';
import { writeLogDataPoint } from './analytics';

// ─── 공개 입력 타입 ────────────────────────────────────────────────────────
// LogEntry에서 서버가 자동 채우는 필드(ts, source 기본값, env, requestId, userId)는
// 호출부에서 생략 가능. 명시적으로 덮어쓰면 우선.
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

// ─── LogContext (Hono Context에서 추출한 로깅 의존성) ──────────────────────
export interface LogContext {
  db: D1Database;
  analytics?: AnalyticsEngineDataset;
  executionCtx: { waitUntil(promise: Promise<unknown>): void };
  env: 'dev' | 'production';
  requestId?: string;
  user?: { userKey: number } | null;
  discordWebhookDefault?: string;
  appVersion?: string;
}

export function buildLogContext(c: Context<AppEnv>): LogContext {
  return {
    db: c.env.DB,
    analytics: c.env.LOGS_ANALYTICS,
    executionCtx: c.executionCtx,
    env: c.env.ENVIRONMENT === 'production' ? 'production' : 'dev',
    requestId: c.get('requestId'),
    user: c.get('user'),
    discordWebhookDefault: c.env.DISCORD_WEBHOOK_DEFAULT,
  };
}

// ─── 메인 entry point ─────────────────────────────────────────────────────
export function log(c: Context<AppEnv>, input: LogEntryInput): void {
  logWithContext(buildLogContext(c), input);
}

// 독립 컨텍스트(scheduled handler 등)에서 호출용.
export function logWithContext(ctx: LogContext, input: LogEntryInput): void {
  const sanitizedContext = sanitizeContext(input.context);

  const entry: LogEntry = {
    ts: Date.now(),
    source: input.source ?? 'server',
    level: input.level,
    event: input.event,
    message: input.message,
    userId: input.userId !== undefined ? input.userId : (ctx.user?.userKey ?? null),
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

  // Tier 1: Workers Logs — 항상. 레벨별 console 메서드 매핑.
  const consoleFn =
    entry.level === 'error' || entry.level === 'fatal'
      ? 'error'
      : entry.level === 'warn'
        ? 'warn'
        : 'log';
  console[consoleFn](JSON.stringify(entry));

  // Tier 2: Analytics Engine — 항상. 샘플링 없이. non-blocking (ADR-013).
  if (ctx.analytics) {
    writeLogDataPoint(ctx.analytics, entry);
  }

  // Tier 3: D1 INSERT — 샘플링 통과시 waitUntil로 비동기.
  if (shouldSample(entry, ctx.env)) {
    ctx.executionCtx.waitUntil(
      insertLog(ctx.db, entry).catch((err: unknown) => {
        // D1 실패해도 Tier 1은 이미 찍혔음. 실패 자체만 기록.
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

  // Discord 알림 — error/fatal만. webhook이 있을 때.
  if (
    (entry.level === 'error' || entry.level === 'fatal') &&
    ctx.discordWebhookDefault
  ) {
    ctx.executionCtx.waitUntil(
      sendDiscordAlert(ctx.discordWebhookDefault, entry).catch(() => {
        // Discord 실패는 비즈니스에 영향 X — 무시.
      }),
    );
  }
}

// ─── 샘플링 ───────────────────────────────────────────────────────────────
// 결정론적 해시 — 같은 엔트리는 같은 fate. 디버깅 시 재현 가능.
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

// ─── PII Sanitize ─────────────────────────────────────────────────────────
// 화이트리스트 방식 — 허용되지 않은 키는 [REDACTED].
// 호출부에서도 최소한의 데이터만 담아야 하지만, logger가 최종 방어선.
const ALLOWED_CONTEXT_KEYS = new Set<string>([
  // 식별자 (민감 X)
  'studyId', 'roundId', 'submissionId', 'participantId',
  'ownerId', 'userKey', 'userId', 'studyIdList',
  // 스터디/회차 메타
  'title', 'roundNumber', 'description', 'participantCount',
  'rate', 'submittedCount', 'total', 'notSubmittedHandles',
  'dueAt', 'delayMinutes',
  // 인프라
  'durationMs', 'sqlHash', 'queryCount', 'endpoint', 'method',
  'path', 'status', 'code', 'errorCode', 'errorName',
  'version', 'jobName', 'migrationsCount', 'cronTrigger',
  'violation', 'rateLimit', 'remaining', 'reset', 'authMode',
  'environment', 'tossApiBase',
  // 추적
  'requestId', 'sessionId', 'cfRay', 'component', 'componentStack',
  'stack', 'source', 'referrer', 'url', 'urlLength', 'line', 'col',
  // 도구
  'tool', 'argsShape', 'resultShape',   // 컨테이너 키 — 이 키들은 내부 필드를 재귀 sanitize함.
  // 명시적으로 안전한 컨테이너만 등록. PII가 들어갈 수 있는 키(meta)는 제외.
  'details', 'extra',
  // 카운터
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

// ─── D1 INSERT ────────────────────────────────────────────────────────────
// 단일 엔트리는 prepared statement. 배치는 insertLogBatch 사용 (클라이언트 라우트).
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
      entry.ts,
      entry.level,
      entry.source,
      entry.event,
      entry.message,
      entry.userId ?? null,
      entry.sessionId ?? null,
      entry.requestId ?? null,
      entry.method ?? null,
      entry.path ?? null,
      entry.status ?? null,
      entry.durationMs ?? null,
      entry.context ? JSON.stringify(entry.context) : null,
      entry.stack ?? null,
      entry.env ?? 'dev',
      entry.version ?? null,
      entry.userAgent ?? null,
      entry.ipHash ?? null,
    )
    .run();
}

export async function insertLogBatch(
  db: D1Database,
  entries: LogEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  const stmts = entries.map((entry) =>
    db
      .prepare(INSERT_SQL)
      .bind(
        entry.ts,
        entry.level,
        entry.source,
        entry.event,
        entry.message,
        entry.userId ?? null,
        entry.sessionId ?? null,
        entry.requestId ?? null,
        entry.method ?? null,
        entry.path ?? null,
        entry.status ?? null,
        entry.durationMs ?? null,
        entry.context ? JSON.stringify(entry.context) : null,
        entry.stack ?? null,
        entry.env ?? 'dev',
        entry.version ?? null,
        entry.userAgent ?? null,
        entry.ipHash ?? null,
      ),
  );
  await db.batch(stmts);
}

// ─── Discord 알림 ─────────────────────────────────────────────────────────
async function sendDiscordAlert(
  webhookUrl: string,
  entry: LogEntry,
): Promise<void> {
  const color =
    entry.level === 'fatal' ? 0x000000 : entry.level === 'error' ? 0xEF4444 : 0xF59E0B;

  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: 'Environment', value: entry.env ?? '?', inline: true },
    { name: 'Source', value: entry.source, inline: true },
  ];
  if (entry.path) fields.push({ name: 'Path', value: entry.path, inline: true });
  if (entry.requestId)
    fields.push({ name: 'Request ID', value: `\`${entry.requestId}\``, inline: true });
  if (entry.userId != null)
    fields.push({ name: 'User', value: String(entry.userId), inline: true });
  if (entry.durationMs != null)
    fields.push({ name: 'Duration', value: `${entry.durationMs}ms`, inline: true });

  const embed = {
    title: `[${entry.level.toUpperCase()}] ${entry.event}`,
    description: entry.message.slice(0, 4000),
    color,
    fields: fields.slice(0, 25), // Discord embed field limit
    footer: { text: 'StudyOps Logger' },
    timestamp: new Date(entry.ts).toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────
// 레벨 비교용 (sample에서 외부 사용).
export function levelGte(a: LogLevel, b: LogLevel): boolean {
  return LOG_LEVEL_WEIGHT[a] >= LOG_LEVEL_WEIGHT[b];
}
