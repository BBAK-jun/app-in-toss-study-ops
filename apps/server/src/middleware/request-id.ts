// Request ID 미들웨어 — cf-ray 우선, 없으면 crypto.randomUUID()로 생성.
// c.set('requestId', ...) 로 컨텍스트에 주입 → errorHandler/handlers에서 동일 ID 참조.
// 응답 헤더 X-Request-Id 로 클라이언트에 노출 → 사용자 디버깅 지원.
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../env';

export const requestIdMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const requestId = c.req.header('cf-ray') || crypto.randomUUID();
  c.set('requestId', requestId);
  await next();
  c.header('X-Request-Id', requestId);
};
