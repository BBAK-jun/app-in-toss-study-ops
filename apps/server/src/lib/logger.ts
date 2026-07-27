import type { Context } from 'hono';
import type { LogLevel, LogEntry, LogSource, LogEvent } from '@studyops/shared';
import { LOG_SAMPLING_RATE, LOG_LEVEL_WEIGHT } from '@studyops/shared';
import type { AppEnv } from '../env';
import { forwardToLogServer } from './log-forwarder';

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
  executionCtx: { waitUntil(promise: Promise<unknown>): void };
  env: 'dev' | 'production';
  requestId?: string;
  logServerUrl?: string;
  discordWebhookDefault?: string;
  appVersion?: string;
}

export function buildLogContext(c: Context<AppEnv>): LogContext {
  return {
    executionCtx: c.executionCtx,
    env: c.env.ENVIRONMENT === 'production' ? 'production' : 'dev',
    requestId: c.get('requestId'),
    logServerUrl: c.env.LOG_SERVER_URL,
    discordWebhookDefault: c.env.DISCORD_WEBHOOK_DEFAULT,
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

  if (shouldSample(entry, ctx.env) && ctx.logServerUrl) {
    ctx.executionCtx.waitUntil(
      forwardToLogServer(
        { LOG_SERVER_URL: ctx.logServerUrl, ENVIRONMENT: ctx.env },
        entry,
      ).catch(() => {}),
    );
  }

  if (
    (entry.level === 'error' || entry.level === 'fatal') &&
    ctx.discordWebhookDefault
  ) {
    ctx.executionCtx.waitUntil(
      sendDiscordAlert(ctx.discordWebhookDefault, entry).catch(() => {}),
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

async function sendDiscordAlert(webhookUrl: string, entry: LogEntry): Promise<void> {
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
    fields: fields.slice(0, 25),
    footer: { text: 'StudyOps Logger' },
    timestamp: new Date(entry.ts).toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

export function levelGte(a: LogLevel, b: LogLevel): boolean {
  return LOG_LEVEL_WEIGHT[a] >= LOG_LEVEL_WEIGHT[b];
}
