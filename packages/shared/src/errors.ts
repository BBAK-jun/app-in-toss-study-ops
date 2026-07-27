// 에러 응답 통일 포맷.
// HTTP 상태 코드 매핑:
//   401 UNAUTHORIZED, 403 FORBIDDEN, 404 NOT_FOUND, 400 VALIDATION_ERROR,
//   409 CONFLICT, 502 TOSS_AUTH_FAILED / DISCORD_WEBHOOK_FAILED, 500 INTERNAL_ERROR,
//   503 ANALYTICS_ENGINE_ERROR / R2_NOT_CONFIGURED.

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'TOSS_AUTH_FAILED'
  | 'DISCORD_WEBHOOK_FAILED'
  | 'ANALYTICS_ENGINE_ERROR'
  | 'R2_NOT_CONFIGURED'
  | 'INTERNAL_ERROR';

// 에러 본문 (error 객체 내부)
export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
}

// 모든 에러 응답의 표준 형태
export interface ApiErrorResponse {
  error: ApiErrorBody;
}
