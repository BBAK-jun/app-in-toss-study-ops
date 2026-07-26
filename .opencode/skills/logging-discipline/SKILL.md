---
name: logging-discipline
description: 기능 개발 시 로깅을 빠뜨리지 않도록 강제하는 체크리스트 스킬. 새 API 라우트, 새 페이지/컴포넌트, 외부 API 호출, 에러 핸들링, DB 변경, 인증 분기, 비동기 작업을 다룰 때 반드시 로드. 트리거 — "기능 개발", "feature", "API 추가", "라우트 추가", "새 페이지", "새 컴포넌트", "구현해줘", "implement", "add endpoint", "새 도메인", "새 이벤트". ADR-011 기반.
---

# Logging Discipline — 기능 개발 시 로깅 체크리스트

## 언제 이 스킬을 쓰는가

**기능 개발 task를 시작하기 전에 반드시 로드한다.** 특히 아래 작업을 할 때:

- 새 API 엔드포인트 (Hono 라우트) 추가
- 새 React 페이지/컴포넌트
- 외부 API 호출 (Toss OAuth, Discord webhook, mTLS)
- 에러 핸들링 로직 (`try/catch`, `HttpError` throw)
- DB 변경 (INSERT/UPDATE/DELETE, 마이그레이션)
- 인증/인가 분기 (`authMiddleware` 통과 후 권한 검사)
- 비동기 작업 (`ctx.waitUntil`, cron handler, DO 메서드)
- 새 사용자 액션 (버튼 클릭, 폼 제출, 페이지 이탈)

이 스킬은 **체크리스트로 동작**한다. 구현 전/중/후 각 단계에서 해당 항목을 확인한다.

---

## Phase 1: 구현 전 — "이 작업에 로그가 필요한가?"

아래 질문 중 **하나라도 Yes**면 로깅이 필요하다:

1. 사용자가 직접 겪는 결과를 만드는가? (생성/수정/삭제/전송)
2. 외부 시스템과 통신하는가? (Toss API, Discord, 외부 webhook)
3. 실패 시 사용자에게 에러 메시지가 노출되는가?
4. 비즈니스 데이터가 변경되는가? (스터디/회차/제출/참여자)
5. 인증·권한 검사가 있는가?
6. 시간이 오래 걸릴 수 있는 작업인가? (DB 쿼리, 네트워크)

모두 No → 로깅 불필요. 단, 디버깅용 `log.debug`는 자유롭게 추가 가능 (prod에서 자동 샘플링 0%).

---

## Phase 2: 구현 중 — 레벨 선택 결정 트리

```
이 로그를 보는 사람은 누구인가?
│
├─ 운영자(나/팀)가 장애 원인 분석용
│  └─ error (자동 복구됨) 또는 fatal (사람 개입 필요)
│
├─ 운영자가 "사용자가 뭘 했는지" 파악용
│  └─ info (자동 샘플링 10%, forceSample으로 100% 가능)
│
├─ 예상치 못한 상황이지만 서비스는 정상
│  └─ warn (100% 수집)
│
└─ 내가 디버깅 중 (prod에서는 끔)
   └─ debug (prod 0%, dev 100%)
```

### 레벨별 기준 (요약)

| Level | 언제 | 예시 |
|---|---|---|
| `debug` | 내가 디버깅할 때만 보고 싶음 | "사용자 1234의 스터디 목록: [...]" |
| `info` | 정상 비즈니스 이벤트 | "스터디 생성됨", "회차 제출됨" |
| `warn` | 예상치 못한 정상 동작 | "토큰 만료 임박", "Rate limit 80% 도달", "fallback 경로 사용" |
| `error` | 오류. 자동 복구 | "D1 쿼리 실패, 재시도", "Discord webhook 4xx 응답" |
| `fatal` | 서비스 중단. 사람 개입 | "부팅 검증 실패", "마이그레이션 실패", "DB 스키마 불일치" |

### forceSample 사용 기준

기본 info는 prod에서 10%만 수집된다. **아래 경우는 100% 수집해야 한다**:

- 비즈니스 핵심 이벤트: `study.created`, `round.created`, `submission.created`
- 감사 추적 필요: `study.deleted`, 권한 거부, 데이터 파기
- 결제/인증 성공: `auth.login.success`

사용법: `forceSample: true` 플래그를 LogEntry에 추가.

---

## Phase 3: 이벤트 네이밍 — LOG_EVENTS에 먼저 추가

새 이벤트는 `packages/shared/src/logs.ts::LOG_EVENTS`에 먼저 추가해야 한다. 그렇지 않으면 타입 에러.

### 컨벤션: `domain.action` (snake_case action)

| Domain | 의미 | 예시 |
|---|---|---|
| `auth.*` | 인증/세션/권한 | `auth.login.success`, `auth.forbidden` |
| `study.*`, `round.*`, `submission.*` | 비즈니스 도메인 | `study.created`, `submission.late` |
| `infra.*` | 인프라/시스템 | `infra.worker.boot`, `infra.db.error` |
| `client.*` | 클라이언트 발생 | `client.page.view`, `client.error.unhandled` |
| `mcp.*` | MCP 도구 (ADR-010) | `mcp.tool.invoked` |

### 새 이벤트 추가 절차

```typescript
// packages/shared/src/logs.ts
export const LOG_EVENTS = {
  // ...기존
  STUDY_ARCHIVED: 'study.archived',  // ← 추가
} as const;
```

그 다음 로깅 코드에서 사용:

```typescript
log(ctx, {
  level: 'info',
  event: LOG_EVENTS.STUDY_ARCHIVED,
  message: `Study ${studyId} archived`,
  context: { studyId, ownerId },
  forceSample: true,  // 감사 추적
});
```

---

## Phase 4: PII 체크 — 로그에 담기 전 반드시 확인

### 절대 로깅하면 안 되는 것

- ❌ Toss 액세스 토큰 (`accessToken`, `sessionToken`)
- ❌ mTLS 인증서 / 개인키
- ❌ SESSION_SECRET
- ❌ MCP_API_TOKEN
- ❌ 사용자 이메일/전화번호 평문
- ❌ Discord webhook URL 전체
- ❌ 비밀번호 (당연히)
- ❌ 요청 바디 전체 (통째로 context에 넣지 말 것)

### 안전하게 로깅할 수 있는 것

- ✅ `user_id` (DB PK, 정수)
- ✅ 엔티티 ID (`studyId`, `roundId`, `submissionId`)
- ✅ HTTP 메타데이터 (`method`, `path`, `status`, `durationMs`)
- ✅ `request_id`, `session_id` (UUID, 추적용)
- ✅ 에러 메시지, 스택트레이스
- ✅ 사용자가 입력한 비밀번호 외의 폼 데이터 (제한적)

### 화이트리스트 방식으로 context 담기

```typescript
// 좋은 예
log(ctx, {
  level: 'info',
  event: LOG_EVENTS.SUBMISSION_CREATED,
  message: 'Submission created',
  context: {
    submissionId: submission.id,
    roundId: submission.roundId,
    participantId: submission.participantId,
    urlLength: submission.url.length,  // URL 자체는 민감할 수 있음
  },
});

// 나쁜 예 — 통째로 담으면 PII 노출 위험
log(ctx, {
  ...,
  context: { submission },  // ← ❌ note 필드에 개인정보 있을 수 있음
});
```

서버 로거(`lib/logger.ts::sanitizeContext()`)가 화이트리스트 기반으로 한 번 더 검사하지만, **호출부에서부터 최소한의 데이터만 담는 습관**이 중요하다.

---

## Phase 5: 클라이언트 vs 서버 — 어디에 로깅할까

### 서버에만 로깅 (클라이언트 로그 불필요)

- DB 변경 결과
- 외부 API 호출 (Toss OAuth, Discord)
- 인증 토큰 검증
- Rate limit 판정

→ `apps/server/src/routes/*.ts`, `lib/*.ts`에서 `log(ctx, ...)` 호출.

### 클라이언트에만 로깅

- 페이지 진입/이탈
- 클릭 이벤트 (사용자 행동)
- 폼 입력 검증 실패 (서버 도달 전)
- React 렌더 에러 (ErrorBoundary)
- 느린 렌더 (React Profiler)
- 페이지 언로드 (이탈 추적)

→ `apps/client/src/lib/logger/index.ts`의 `logger.info(...)`, `logger.error(...)` 호출.

### 양쪽 다 로깅 (드물지만 중요)

- **API 호출 결과**: 클라이언트는 "요청 보냄/응답 받음", 서버는 "처리함/에러 발생"
- **에러**: 클라이언트에서 `client.api.error`, 서버에서 이미 `errorHandler`가 자동 로깅

양쪽 다 로깅할 때는 **같은 `request_id`** 로 연결되어야 한다. 클라이언트가 `X-Request-Id` 헤더로 받은 값을 로그에 포함.

---

## Phase 6: 코드 작성 패턴

### 서버 — Hono 라우트에서 로깅

```typescript
// apps/server/src/routes/studies.ts
import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { log } from '../lib/logger';
import { LOG_EVENTS } from '@studyops/shared';

export const studyRoutes = new Hono<AppEnv>();

studyRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  // ... 비즈니스 로직 ...
  const study = await createStudy(c.env.DB, { ownerId: user.userKey, ...body });

  log(c, {
    level: 'info',
    source: 'server',
    event: LOG_EVENTS.STUDY_CREATED,
    message: `Study ${study.id} created by user ${user.userKey}`,
    context: {
      studyId: study.id,
      title: study.title,
      participantCount: body.participants?.length ?? 0,
    },
    forceSample: true,  // 비즈니스 핵심 이벤트
  });

  return c.json(study, 201);
});
```

### 서버 — 에러 케이스

```typescript
studyRoutes.delete('/:id', async (c) => {
  try {
    await deleteStudy(c.env.DB, c.req.param('id'));
    log(c, {
      level: 'warn',  // 삭제는 warn (감사)
      source: 'server',
      event: LOG_EVENTS.STUDY_DELETED,
      message: `Study ${c.req.param('id')} deleted`,
      context: { studyId: c.req.param('id') },
      forceSample: true,
    });
    return c.body(null, 204);
  } catch (err) {
    log(c, {
      level: 'error',
      source: 'server',
      event: LOG_EVENTS.INFRA_DB_ERROR,
      message: `Failed to delete study ${c.req.param('id')}`,
      context: { studyId: c.req.param('id') },
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;  // errorHandler가 500 응답 + 자동 error 로그
  }
});
```

### 클라이언트 — React 컴포넌트에서 로깅

```typescript
// apps/client/src/pages/StudiesPage.tsx
import { logger } from '../lib/logger';
import { LOG_EVENTS } from '@studyops/shared';

export function StudiesPage() {
  useEffect(() => {
    logger.info({
      event: LOG_EVENTS.CLIENT_PAGE_VIEW,
      message: 'StudiesPage mounted',
      context: { referrer: document.referrer },
    });
  }, []);

  const handleCreate = async () => {
    try {
      await createStudy({ ... });
      logger.info({
        event: LOG_EVENTS.STUDY_CREATED,  // 같은 이벤트, 클라이언트 관점
        message: 'User created study',
      });
    } catch (err) {
      logger.error({
        event: LOG_EVENTS.CLIENT_API_ERROR,
        message: 'Failed to create study',
        context: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  };
}
```

### ErrorBoundary 통합

```typescript
// apps/client/src/components/ErrorBoundary.tsx
componentDidCatch(error: Error, info: ErrorInfo): void {
  logger.error({
    event: LOG_EVENTS.CLIENT_ERROR_BOUNDARY,
    message: error.message,
    context: { componentStack: info.componentStack },
    stack: error.stack,
  });
}
```

---

## Phase 7: 구현 후 자체 점검 체크리스트

PR/커밋 전에 아래를 확인한다:

- [ ] 새로 추가한 이벤트가 `LOG_EVENTS`에 정의되어 있는가?
- [ ] level이 적절한가? (info가 남발되면 안 됨 — 대부분은 debug로 충분)
- [ ] `context`에 PII가 없는가? (토큰, 이메일, 전화번호, 요청 바디 통째로)
- [ ] forceSample이 필요한 이벤트에만 붙었는가?
- [ ] 서버 로깅이 `ctx.waitUntil`로 비동기 처리되었는가? (응답 블록 방지)
- [ ] 클라이언트 로깅이 ErrorBoundary에 통합되었는가?
- [ ] 에러 케이스를 로깅했는가? (성공 케이스만 로깅하지 말 것)
- [ ] 대시보드에서 이 이벤트로 검색하면 의미 있는 결과가 나오는가?

---

## 안티패턴

### ❌ Anti: `console.log` 직접 호출

```typescript
console.log('user did X', userId);  // Workers Logs에는 남지만 D1 영속화 X
```

대신: `log(ctx, { ... })` 또는 `logger.info({ ... })` 사용. Tier 1 + Tier 2 동시 처리.

예외: Worker 부팅 직전(`boot-check.ts`)에는 logger 의존성이 아직 초기화 안 됐을 수 있음 → `console.error(JSON.stringify({level, event, ...}))` 형식 허용.

### ❌ Anti: 이벤트 이름 하드코딩

```typescript
log(ctx, { event: 'study.created', ... });  // ← 타입 안전성 없음
```

대신: `LOG_EVENTS.STUDY_CREATED` 사용. 오타 방지 + 리팩토링 안전.

### ❌ Anti: 로그 레벨 없이 메시지만

```typescript
log(ctx, { message: 'something happened' });  // ← level, event 없음
```

LogEntry의 `level`, `source`, `event`, `message`, `ts`는 필수. TypeScript가 강제하므로 사실상 불가능하지만, optional 필드를 남용하지 말 것.

### ❌ Anti: 에러를 삼키면서 warn만 로깅

```typescript
try { ... } catch (e) { log(ctx, { level: 'warn', message: 'failed' }); }
```

에러는 `error` 레벨로. `stack` 포함. 사용자 영향 있으면 throw 다시.

---

## 참조

- ADR-011: 전체 로깅 아키텍처 (`docs/wiki/src/content/decisions/adr-011-logging-architecture.md`)
- 이벤트 카탈로그: `packages/shared/src/logs.ts::LOG_EVENTS`
- 서버 로거: `apps/server/src/lib/logger.ts`
- 클라이언트 로거: `apps/client/src/lib/logger/`
- 대시보드: `/admin/logs` 페이지
- PII 정책: ADR-011 §3
