---
id: adr-012
title: 테스트 인프라 도입 — Vitest + @cloudflare/vitest-pool-workers
status: accepted
date: 2026-07-26
supersededBy: null
tags: [server, testing, deps, vitest, miniflare]
---

# ADR-012: 테스트 인프라 도입 — Vitest + @cloudflare/vitest-pool-workers

## Context

ADR-006 이후 서버 구조 강화(에러 정규화, CORS, requestId, 딥 헬스체크)로 미들웨어 체인이
복잡해졌다. 현재 검증 수단은 `npm run typecheck`(tsc --noEmit) 단일 라인뿐이라,
런타임 동작 검증이 부재. HARNESS §4 rule 3("테스트 삭제 금지")가 있지만 **테스트 자체가 없다.**

PR #6에서 추가한 미들웨어들은 단위 테스트로 검증하기 좋은 순수 로직:
- `formatHttpError(err, ctx)` — HttpError vs unknown 분기
- `pickAllowedOrigin(origin, env)` — ENVIRONMENT 기반 origin 결정
- `requestIdMiddleware` — cf-ray 우선순위, X-Request-Id 헤더

반면 `/ready`, `/auth/login`, `/studies` CRUD는 D1 binding이 필요한 통합 테스트 영역.

## Decision

**Vitest + `@cloudflare/vitest-pool-workers`(Miniflare 기반)를 도입한다.**

### 새 의존성 (HARNESS §4 rule 7 — ADR 필수)

| 패키지 | 위치 | 용도 | 번들 영향 |
|---|---|---|---|
| `vitest` | `apps/server` devDependency | 테스트 러너, assert, mock | 0 (devDependency, Workers bundle에 미포함) |
| `@cloudflare/vitest-pool-workers` | `apps/server` devDependency | Miniflare로 Workers 환경 시뮬레이션 (D1, env, ctx) | 0 (동일) |

**런타임/번들 사이즈 영향 0** — devDependency만 추가, Workers deploy 번들에서 제외.

### 커버리지 전략

| 영역 | 테스트 종류 | 도구 |
|---|---|---|
| `lib/http-error.ts` (`formatHttpError`) | 단위 (순수 함수) | Vitest (pool 없이) |
| `middleware/cors.ts` (`pickAllowedOrigin`) | 단위 (순수 함수) | Vitest |
| `middleware/request-id.ts` | 단위 (Hono context mock) | Vitest |
| `routes/health.ts` (`/ready` D1 호출) | 통합 (Miniflare D1) | pool-workers |
| `routes/studies.ts` (CRUD) | 통합 (Miniflare D1) | pool-workers |

초기 도입은 **단위 테스트 3개 + 통합 테스트 1개(/ready)**. CRUD 통합 테스트는 follow-up.

### 설정 파일 (`apps/server/vitest.config.ts`)

`pool: 'workers'` + `workers: { wrangler: { configPath: './wrangler.jsonc' } }` 로
wrangler.jsonc의 binding을 그대로 상속. miniflare가 로컬 sqlite를 `.wrangler/state/v3/d1/` 에
생성 (기본값 유지).

### CI 연동

GitHub Actions `ci.yml` 의 `typecheck` job에 `npm run test` 추가. PR 게이트로 적용.

## Consequences

### 긍정
- 미들웨어 로직 변경 시 회귀 즉시 검출 → PR #6 같은 아키텍처 강화 작업이 안전해짐
- D1 스키마 마이그레이션 후 로컬에서 즉시 검증 가능 (vs 현재 수동 curl)
- HARNESS §4 rule 3("테스트 삭제 금지")의 전제가 됨 — 테스트가 있어야 "삭제 금지" 의미 있음

### 부정
- 의존성 2개 증가 — `npm install` 시간 약간 길어짐
- Workers 풀 환경 학습 곡선 — 일반 Node.js 테스트와 다른 점 (binding 주입, `SELF.fetch()` 패턴)
- 첫 통합 테스트 시 miniflare D1 sqlite 생성 → 약 1초 cold start

### 중립
- CI 실행 시간 증가 (현재 typecheck 1분 → test 추가 시 약 1.5분 예상)
- 테스트 파일 작성 부담 — 하지만 리뷰어 신뢰도 상승으로 상쇄

## Alternatives Considered

### Bun test / Node.js native test runner
- **장점**: 별도 의존성 없음
- **기각**: Workers 환경(D1, env binding) 시뮬레이션 불가. mock 노력이 큼

### Jest
- **장점**: 익숙한 API
- **기각**: Cloudflare Workers 공식 지원이 pool-workers로 수렴. Jest + miniflare 조합은 비권장

### 수동 curl 스크립트 유지
- **장점**: 의존성 0
- **기각**: 회귀 검증 불가, CI 자동화 불가, 운영자 수작업 부담

## References

- HARNESS.md §4 rule 3 (테스트 삭제 금지), §4 rule 7 (새 의존성 ADR 필수)
- Cloudflare Workers Testing: https://developers.cloudflare.com/workers/testing/vitest-config/
- ADR-006 (env 분리 — 테스트도 dev/prod 환경 분리 필요)
- ADR-007 (D1 격리 — 통합 테스트는 dev DB만 사용)
