import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../env';
import { LOG_EVENTS } from '@studyops/shared';
import type { LogEntryInput } from '../lib/logger';
import { forwardToLogServer } from '../lib/log-forwarder';

function scheduleForward(
  c: Parameters<MiddlewareHandler<AppEnv>>[0],
  input: LogEntryInput,
): void {
  try {
    const promise = forwardToLogServer(c.env, input);
    if (c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil(promise);
    }
  } catch {
    // Log forwarding is non-critical — must not break the response
  }
}

export const loggingMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const start = Date.now();

  await next();

  const durationMs = Date.now() - start;
  const status = c.res.status;
  const requestId = c.get('requestId');

  if (status >= 500) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: LOG_EVENTS.INFRA_HTTP_SERVER_ERROR,
        message: `${c.req.method} ${c.req.path} → ${status}`,
        method: c.req.method,
        path: c.req.path,
        status,
        durationMs,
        requestId,
      }),
    );
    scheduleForward(c, {
      level: 'error',
      event: LOG_EVENTS.INFRA_HTTP_SERVER_ERROR,
      message: `${c.req.method} ${c.req.path} → ${status}`,
      method: c.req.method,
      path: c.req.path,
      status,
      durationMs,
      requestId,
    });
  } else if (status >= 400) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        event: LOG_EVENTS.INFRA_HTTP_CLIENT_ERROR,
        message: `${c.req.method} ${c.req.path} → ${status}`,
        method: c.req.method,
        path: c.req.path,
        status,
        durationMs,
        requestId,
      }),
    );
    scheduleForward(c, {
      level: 'warn',
      event: LOG_EVENTS.INFRA_HTTP_CLIENT_ERROR,
      message: `${c.req.method} ${c.req.path} → ${status}`,
      method: c.req.method,
      path: c.req.path,
      status,
      durationMs,
      requestId,
    });
  }
};
