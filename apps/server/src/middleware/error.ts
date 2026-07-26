// errorHandler — Hono onError 핸들러. HttpError 를 잡아 통일 포맷 { error: { code, message } } 로 응답.
// try/catch 미들웨어 대신 app.onError 사용: 마운트된 sub-app 경계에서도 모든 throw 를 안정적으로 포착.
import type { ErrorHandler } from 'hono/types';
import type { AppEnv } from '../env';
import { HttpError } from '../lib/http-error';
import type { ApiErrorResponse } from '@studyops/shared';

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof HttpError) {
    const body: ApiErrorResponse = { error: { code: err.code, message: err.message } };
    return c.json(body, err.status as 400);
  }
  console.error('[studyops] unhandled error:', err);
  const body: ApiErrorResponse = {
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  };
  return c.json(body, 500);
};
