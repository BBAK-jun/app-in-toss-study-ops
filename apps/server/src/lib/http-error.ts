// 통일 에러 클래스. 라우트/인증/Discord 어디서든 throw → errorHandler가 포맷팅.
import type { ApiErrorCode, ApiErrorResponse } from '@studyops/shared';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

// errorHandler(/mcp 인증 실패 포함)가 공유하는 변환 컨텍스트.
// Hono Context 없이도 Response 생성 가능 — index.ts의 /mcp 분기 등에서 사용.
export interface FormatErrorContext {
  requestId: string;
  method: string;
  path: string;
  userKey: number | null;
}

// 에러 → 표준 JSON Response + 구조화 로그. Hono onError 핸들러와 /mcp 직접 응답이 동일 포맷/로그를 사용.
export function formatHttpError(err: unknown, ctx: FormatErrorContext): Response {
  if (err instanceof HttpError) {
    console.error(
      JSON.stringify({
        level: 'warn',
        event: 'http_error',
        requestId: ctx.requestId,
        method: ctx.method,
        path: ctx.path,
        status: err.status,
        code: err.code,
        message: err.message,
        userKey: ctx.userKey,
      }),
    );
    const body: ApiErrorResponse = { error: { code: err.code, message: err.message } };
    return new Response(JSON.stringify(body), {
      status: err.status,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': ctx.requestId },
    });
  }

  console.error(
    JSON.stringify({
      level: 'error',
      event: 'unhandled_error',
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      status: 500,
      code: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      userKey: ctx.userKey,
    }),
  );
  const body: ApiErrorResponse = {
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  };
  return new Response(JSON.stringify(body), {
    status: 500,
    headers: { 'Content-Type': 'application/json', 'X-Request-Id': ctx.requestId },
  });
}
