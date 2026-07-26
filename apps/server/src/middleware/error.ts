// errorHandler — Hono onError 핸들러. formatHttpError 로 위임 (lib/http-error.ts).
// requestId 는 requestIdMiddleware 가 세팅한 c.get('requestId') 우선, 없으면 cf-ray, 최후로 randomUUID.
// /mcp 분기의 직접 formatHttpError 호출과 동일한 JSON 포맷/구조화 로그를 사용.
import type { ErrorHandler } from 'hono/types';
import type { AppEnv } from '../env';
import { formatHttpError } from '../lib/http-error';

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  const requestId = c.get('requestId') || c.req.header('cf-ray') || crypto.randomUUID();
  return formatHttpError(err, {
    requestId,
    method: c.req.method,
    path: c.req.path,
    userKey: c.get('user')?.userKey ?? null,
  });
};
