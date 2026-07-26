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

export function formatHttpError(err: unknown, ctx: {
  requestId: string;
  method: string;
  path: string;
}): Response {
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
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
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
