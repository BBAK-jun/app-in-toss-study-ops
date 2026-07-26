// errorHandler — Hono onError 핸들러. HttpError 를 잡아 통일 포맷 { error: { code, message } } 로 응답.
// try/catch 미들웨어 대신 app.onError 사용: 마운트된 sub-app 경계에서도 모든 throw 를 안정적으로 포착.
//
// 모든 에러는 구조화 JSON 로그로 출력 (observability 활성화 시 wrangler tail 에서 즉시 관측).
import type { ErrorHandler } from 'hono/types';
import type { AppEnv } from '../env';
import { HttpError } from '../lib/http-error';
import type { ApiErrorResponse } from '@studyops/shared';

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  // 요청 메타데이터 (에러 진단용)
  const requestId = c.req.header('cf-ray') || crypto.randomUUID();
  const method = c.req.method;
  const path = c.req.path;
  const userKey = c.get('user')?.userKey ?? null;

  if (err instanceof HttpError) {
    // 예측된 에러 (HttpError) — 4xx / 502
    console.error(
      JSON.stringify({
        level: 'warn',
        event: 'http_error',
        requestId,
        method,
        path,
        status: err.status,
        code: err.code,
        message: err.message,
        userKey,
      }),
    );
    const body: ApiErrorResponse = { error: { code: err.code, message: err.message } };
    return c.json(body, err.status as 400);
  }

  // 예측되지 않은 에러 — 500
  console.error(
    JSON.stringify({
      level: 'error',
      event: 'unhandled_error',
      requestId,
      method,
      path,
      status: 500,
      code: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      userKey,
    }),
  );
  const body: ApiErrorResponse = {
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  };
  return c.json(body, 500);
};
