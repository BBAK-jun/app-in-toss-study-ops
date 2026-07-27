import type { LogEntry, LogBatchPayload } from '@studyops/shared';

export function forwardToLogServer(
  env: { LOG_SERVER_URL?: string; ENVIRONMENT: string },
  entry: Partial<LogEntry> & { level: string; event: string; message: string },
): Promise<void> {
  const logServerUrl = env.LOG_SERVER_URL;
  if (!logServerUrl) return Promise.resolve();

  const payload: LogBatchPayload = {
    entries: [{ ...entry, ts: Date.now(), source: entry.source ?? 'server' } as LogEntry],
    client: {
      sessionId: 'server-internal',
      userAgent: 'cloudflare-worker',
    },
  };

  return fetch(`${logServerUrl}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(() => undefined)
    .catch(() => {});
}
