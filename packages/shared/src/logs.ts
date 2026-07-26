// 로깅 도메인 타입 — 서버/클라이언트 공유.
// ADR-011 참조. 모든 로그 엔트리의 표준 형태.
//
// 사용:
//   서버: log(ctx, { level: 'info', event: LOG_EVENTS.STUDY.CREATED, message: '...', context: {...} })
//   클라: logger.info({ event: LOG_EVENTS.CLIENT.PAGE_VIEW, message: '...' })

// ─── 로그 레벨 ────────────────────────────────────────────────────────────
// 숫자가 클수록 심각. RFC 5424 기반, 단순화.
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'] as const;

export const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

// 레벨별 샘플링 비율 (prod). 0=수집 안 함, 1=전부 수집.
// dev 환경에서는 모두 1로 override (env.ts / logger.ts 참조).
export const LOG_SAMPLING_RATE: Record<LogLevel, number> = {
  debug: 0,
  info: 0.1,
  warn: 1,
  error: 1,
  fatal: 1,
};

// 레벨별 D1 보관 일수. cron(retention.ts)이 매일 만료 분 삭제.
export const LOG_RETENTION_DAYS: Record<LogLevel, number> = {
  debug: 7,
  info: 30,
  warn: 90,
  error: 90,
  fatal: 365,
};

// ─── 로그 소스 ────────────────────────────────────────────────────────────
// 어디서 발생한 로그인지. 대시보드 필터의 기준.
export type LogSource = 'client' | 'server' | 'cron' | 'mcp';

// ─── 이벤트 카탈로그 ──────────────────────────────────────────────────────
// event 필드의 허용값. 새 이벤트는 반드시 여기에 추가해야 타입 체커가 통과.
// 컨벤션: "domain.action" (snake_case). 도메인은 auth/study/round/submission/
// infra/client/mcp 중 하나.
export const LOG_EVENTS = {
  // 인증/보안
  AUTH_LOGIN_START: 'auth.login.start',
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILED: 'auth.login.failed',
  AUTH_TOKEN_REFRESH: 'auth.token.refresh',
  AUTH_SESSION_EXPIRED: 'auth.session.expired',
  AUTH_FORBIDDEN: 'auth.forbidden',
  AUTH_RATE_LIMITED: 'auth.rate_limited',

  // 스터디 도메인
  STUDY_CREATED: 'study.created',
  STUDY_UPDATED: 'study.updated',
  STUDY_DELETED: 'study.deleted',
  STUDY_NOT_FOUND: 'study.not_found',

  ROUND_CREATED: 'round.created',
  ROUND_REMINDER_SENT: 'round.reminder.sent',
  ROUND_REMINDER_FAILED: 'round.reminder.failed',

  SUBMISSION_CREATED: 'submission.created',
  SUBMISSION_LATE: 'submission.late',

  // 인프라
  INFRA_WORKER_BOOT: 'infra.worker.boot',
  INFRA_BOOT_CHECK_FAILED: 'infra.boot_check.failed',
  INFRA_DB_QUERY_SLOW: 'infra.db.query.slow',
  INFRA_DB_ERROR: 'infra.db.error',
  INFRA_MIGRATION_APPLIED: 'infra.migration.applied',
  INFRA_MIGRATION_FAILED: 'infra.migration.failed',
  INFRA_CRON_COMPLETED: 'infra.cron.completed',
  INFRA_LOG_RETENTION_RUN: 'infra.log.retention_run',
  INFRA_HTTP_CLIENT_ERROR: 'infra.http.client_error',
  INFRA_HTTP_SERVER_ERROR: 'infra.http.server_error',

  // 클라이언트
  CLIENT_PAGE_VIEW: 'client.page.view',
  CLIENT_ERROR_UNHANDLED: 'client.error.unhandled',
  CLIENT_ERROR_PROMISE: 'client.error.promise',
  CLIENT_ERROR_BOUNDARY: 'client.error.boundary',
  CLIENT_API_TIMEOUT: 'client.api.timeout',
  CLIENT_API_ERROR: 'client.api.error',
  CLIENT_RENDER_SLOW: 'client.render.slow',
  CLIENT_SESSION_START: 'client.session.start',
  CLIENT_SESSION_END: 'client.session.end',

  // MCP (ADR-010)
  MCP_TOOL_INVOKED: 'mcp.tool.invoked',
  MCP_TOOL_ERROR: 'mcp.tool.error',

  // 로거 자체
  LOG_DROPPED: 'log.dropped',           // 샘플링/용량 초과로 drop 된 경우
  LOG_QUEUE_OVERFLOW: 'log.queue_overflow',
} as const;

export type LogEvent = (typeof LOG_EVENTS)[keyof typeof LOG_EVENTS];

// ─── 표준 로그 엔트리 ─────────────────────────────────────────────────────
// 클라이언트 → 서버, 서버 내부, 양쪽 모두 이 형태.
// DB 컬럼과 1:1 매핑 (apps/server/src/db/schema.ts::logs 참조).
export interface LogEntry {
  level: LogLevel;
  source: LogSource;
  event: LogEvent;
  message: string;

  // 식별 (PII-safe 규칙은 logger sanitize 적용)
  userId?: number | null;
  sessionId?: string;
  requestId?: string;

  // HTTP 컨텍스트 (서버/클라이언트 공통)
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;

  // 확장 데이터 (sanitize 거친 JSON). 화이트리스트 외 키는 logger가 [REDACTED] 치환.
  context?: Record<string, unknown>;

  // 에러 전용
  stack?: string;

  // 환경 메타
  env?: 'dev' | 'production';
  version?: string;
  userAgent?: string;
  ipHash?: string;

  // 생성 시각 (클라이언트에서 발생시각, 서버 도착시각과 다를 수 있음)
  ts: number;

  // 내부 제어 — 공개 API에서는 노출 X
  forceSample?: boolean;
}

// ─── 클라이언트 → 서버 배치 payload ───────────────────────────────────────
// POST /api/logs 요청 본문 형태. 클라이언트가 batch로 모아서 전송.
export interface LogBatchPayload {
  entries: LogEntry[];
  client: {
    sessionId: string;
    userId?: number | null;
    version?: string;
    userAgent: string;
  };
}

// ─── 대시보드 쿼리 ────────────────────────────────────────────────────────
// GET /api/admin/logs 쿼리 파라미터.
export interface LogQuery {
  level?: LogLevel;
  source?: LogSource;
  event?: LogEvent;
  userId?: number;
  requestId?: string;
  sessionId?: string;
  search?: string;           // message LIKE 검색
  since?: number;            // unix ms
  until?: number;            // unix ms
  cursor?: string;           // 페이지네이션 커서 (ts:id 포맷)
  limit?: number;            // 기본 50, 최대 200
}

// 대시보드 응답. cursor-based pagination (offset 방식보다 ts 정렬 안정적).
export interface LogQueryResult {
  logs: LogRow[];
  nextCursor: string | null;
  total?: number;            // count 쿼리 비용때문에 optional
}

// DB row → 클라이언트로 보내는 형태. context는 JSON 파싱된 객체.
export interface LogRow {
  id: number;
  ts: number;
  level: LogLevel;
  source: LogSource;
  event: LogEvent;
  message: string;
  userId: number | null;
  sessionId: string | null;
  requestId: string | null;
  method: string | null;
  path: string | null;
  status: number | null;
  durationMs: number | null;
  context: Record<string, unknown> | null;
  stack: string | null;
  env: string;
  version: string | null;
  userAgent: string | null;
  ipHash: string | null;
}
