---
id: 2026-07-26-server-arch-hardening
title: 서버 아키텍처 강화 — CORS / requestId / 에러 정규화 / 딥 헬스체크 / dead code 제거
type: server
status: shipped
startedAt: 2026-07-26T16:30:00+09:00
shippedAt: 2026-07-26T17:45:00+09:00
sessionIds:
  - ses_... (server-arch-hardening)
relatedDecisions:
  - adr-011
touchedFiles:
  - apps/server/src/lib/http.ts
  - apps/server/src/lib/http-error.ts
  - apps/server/src/middleware/error.ts
  - apps/server/src/middleware/request-id.ts
  - apps/server/src/middleware/cors.ts
  - apps/server/src/routes/health.ts
  - apps/server/src/env.ts
  - apps/server/src/index.ts
  - apps/server/wrangler.jsonc
  - apps/server/worker-configuration.d.ts
  - docs/wiki/src/content/decisions/adr-011-cors-origin-policy.md
  - docs/wiki/src/content/episodes/2026-07-26-server-arch-hardening.md
linearIssue: null
githubPR: null
tags: [server, cors, error-handling, request-id, health-check, dead-code, security, adr]
summary: "B1+C1+C2+A1+A3 영역 통합 작업: fetchJson dead code 삭제, requestId 미들웨어 + formatHttpError 공통 에러 포맷, ENVIRONMENT 기반 CORS 화이트리스트, /ready 딥 헬스체크, /mcp 401 정규화. ADR-011 작성."
---

## 목표

사용자가 선택한 5개 영역을 한 에피소드에서 통합 처리:

| 코드 | 영역 | 설명 |
|---|---|---|
| B1 | dead code 제거 | `lib/http.ts`의 `fetchJson`이 사용처 0건 → 삭제 (HARNESS §4.4) |
| C1 | 관측성 | requestId 미들웨어 + 구조화 에러 로그의 요청 추적 가능 |
| C2 | 운영 | `/ready` 딥 헬스체크로 D1/ENV/secrets 사전 진단 |
| A1 | 보안 | `prod` 환경 CORS origin 화이트리스트 (기본 거부) |
| A3 | 에러 정규화 | `/mcp` 401을 `formatHttpError`로 통일 (HARNESS §3.2) |

## 설계 결정

### B1: dead code 삭제로 회피

원래 계획은 `fetchJson`의 HttpError 정규화 개선이었으나, grep 결과 사용처 0건.
"미래 확장성"을 위해 남겨두는 것은 HARNESS §4.4 위반 → 삭제로 방향 전환.
별도 ADR 없이 에피소드에 기록만 남김 (회피의 결정 자체를 문서화).

### C1: requestId + formatHttpError 공통 에러 파이프라인

핵심 인사이트: `errorHandler`(Hono onError)와 `/mcp` 직접 응답이 **동일한 변환 로직**을
공유해야 로그/응답 포맷이 일관됨. 이를 위해 `formatHttpError(err, ctx)` 헬퍼를
`lib/http-error.ts`에 두고 양쪽이 호출.

```
Request → requestIdMiddleware → corsMiddleware → routes
                                                    ↓ error
                                              formatHttpError(err, ctx)
                                                    ↓
                                              JSON Response + structured log
```

requestId 소스 우선순위: `cf-ray` 헤더 > `crypto.randomUUID()`.
`X-Request-Id` 응답 헤더로 클라이언트가 추적 가능.

### C2: /ready 딥 헬스체크

- `/health` (라이트): warm 상태만. k8s/ALB liveness용.
- `/ready` (딥): D1 `SELECT 1`, ENVIRONMENT 값, SESSION_SECRET/MCP_API_TOKEN 존재 검사.
  - prod에서만 MCP_API_TOKEN 검사
  - secret 값 자체는 노출하지 않고 `ok: boolean`만
  - 하나라도 실패 시 503

### A1: ENVIRONMENT 기반 CORS 화이트리스트 (ADR-011)

- `prod`: `ALLOWED_ORIGINS` var (콤마 구분) — 미설정 시 모든 cross-origin 거부 (안전한 기본값)
- `dev`: localhost 하드코딩 (Vite 5173, wrangler 8787)
- Hono `cors()` 대신 직접 구현 — `c.env` 접근 + 매 요청 미들웨어 재생성 회피
- `Vary: Origin` 헤더 추가 → CDN 캐시 origin 분리

### A3: /mcp 401 정규화

기존 `/mcp` 401 응답이 Hono 에러 핸들러 밖에서 직접 JSON을 생성하던 것을
`formatHttpError(new HttpError(401, 'UNAUTHORIZED', ...), ctx)`로 교체.
`requestId`는 `cf-ray`에서 읽어와 `/mcp`와 일반 API의 로그 포맷이 동일하게 유지됨.

## 변경 내역

### 삭제
- `apps/server/src/lib/http.ts` — `fetchJson` dead code (사용처 0건)

### 새로 생성
- `apps/server/src/middleware/request-id.ts` — `cf-ray || crypto.randomUUID()` → `X-Request-Id` 헤더
- `apps/server/src/middleware/cors.ts` — ENVIRONMENT 기반 origin 화이트리스트 (ADR-011)
- `docs/wiki/src/content/decisions/adr-011-cors-origin-policy.md`

### 수정
- `apps/server/src/env.ts` — `AppEnv.Variables.requestId: string` 추가
- `apps/server/src/lib/http-error.ts` — `formatHttpError(err, ctx)` 헬퍼 추가 + `FormatErrorContext` 인터페이스
- `apps/server/src/middleware/error.ts` — `formatHttpError` 위임, requestId 폴백 체인
- `apps/server/src/routes/health.ts` — `GET /ready` 딥 헬스체크 추가
- `apps/server/src/index.ts` — requestId/cors 미들웨어 마운트, `/mcp` 401을 `formatHttpError`로 교체
- `apps/server/wrangler.jsonc` — `env.production.vars.ALLOWED_ORIGINS` 추가 (기본값 `https://apps-in-toss.toss.im`)
- `apps/server/worker-configuration.d.ts` — `wrangler types` 재생성

## 검증

- [x] `npm run typecheck` 전체 통과 (shared + server + client 각 tsc --noEmit)
  - 최초 실행 시 `@studyops/shared` 모듈 미발견 에러 → `packages/shared` 빌드 누락이 원인
  - `npm run build -w packages/shared` 실행 후 재검증 → 전체 통과
- [x] `wrangler types` 재생성 — `ALLOWED_ORIGINS`가 Env에 추가됨 확인
- [x] ADR-011 작성 완료 (Context/Decision/Consequences/Alternatives)
- [ ] `wrangler dev` 로컬 부팅 테스트 — 미실행, 코드 리뷰로 대체
- [ ] `wrangler deploy --dry-run --env production` — 미실행
- [ ] `/ready` 실제 D1 호출 검증 — 미실행

## 메모 / 다음에 할 것

### 즉시 (운영자 액션 필요)
- `apps/server/wrangler.jsonc`의 `ALLOWED_ORIGINS` 기본값 `https://apps-in-toss.toss.im`이
  실제 앱인토스 WebView origin과 일치하는지 확인. 다를 경우 wrangler.jsonc 수정 후 재배포.

### 추후 고려
- `ALLOWED_ORIGINS` 부트체크 추가 — `prod`에서 미설정 시 부팅 타임에 throw (현재는 런타임 장애)
- `/ready`의 secret 검사를 별도 `internal/` 경로 + 인증 게이트로 이동 (현재 공개 엔드포인트)
- `formatHttpError`에 Sentry/Logpush 연동 스텁 추가 (현재는 `console.error`만)

### 학습
- Hono onError와 `/mcp` 직접 응답을 같은 포맷으로 통합하려면 공유 헬퍼가 필수 — 그렇지 않으면
  두 경로의 로그 포맷이 서로 달라져 디버깅 시간이 2배로 늘어남
- Hono `cors()`의 `origin` 함수가 `c.env`를 직접 받지 않으므로, env-기반 정책은
  직접 구현이 더 단순하고 explicit함
