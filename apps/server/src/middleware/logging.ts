// HTTP 요청 로깅 미들웨어 — 모든 요청/응답에 대한 추적 인프라.
//
// 책임:
// 1. requestId 부여 (cf-ray 우선, 없으면 UUID) — 응답 헤더 + context 변수
// 2. 응답 duration 측정
// 3. 4xx → warn, 5xx → error 자동 로깅 (2xx는 비즈니스 로직이 명시적으로 로깅)
//
// ADR-011 참조.

import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../env';
import { log } from '../lib/logger';
import { LOG_EVENTS } from '@studyops/shared';

export const loggingMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const requestId = c.req.header('cf-ray') || crypto.randomUUID();
  c.set('requestId', requestId);

  const start = Date.now();

  await next();

  const durationMs = Date.now() - start;
  const status = c.res.status;

  c.header('X-Request-Id', requestId);

  if (status >= 500) {
    log(c, {
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
    log(c, {
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
