---
id: 2026-07-26-rate-limiting
title: Rate Limiting — Cloudflare Native RateLimit Binding 도입
type: server
status: shipped
startedAt: 2026-07-26T22:45:00+09:00
shippedAt: 2026-07-26T23:10:00+09:00
sessionIds:
  - ses_0616d9206ffe3c3ZHA6SoMWbSX
relatedDecisions:
  - adr-013
touchedFiles:
  - apps/server/src/middleware/rate-limit.ts
  - apps/server/src/middleware/rate-limit.test.ts
  - apps/server/src/auth/routes.ts
  - apps/server/src/index.ts
  - apps/server/src/env.ts
  - apps/server/wrangler.jsonc
  - apps/server/worker-configuration.d.ts
  - packages/shared/src/errors.ts
  - docs/wiki/src/content/decisions/adr-013-rate-limiting-cloudflare-native.md
  - docs/wiki/src/content/episodes/2026-07-26-rate-limiting.md
linearIssue: null
githubPR: null
tags: [server, security, rate-limiting, cloudflare]
summary: "Cloudflare Workers Native Rate Limiting API 도입. AUTH_RATE_LIMITER(10/60s) + MCP_RATE_LIMITER(60/60s) 바인딩 추가. /auth/login 무차별 대입 방지, /mcp API 남용 방지. 새 npm 의존성 없음 — 플랫폼 네이티브 기능. 3개 rate-limit 단위 테스트 추가 (총 30 tests)."
---

## 목표

`POST /auth/login` 무차별 대입 공격 방지, `/mcp` API 남용 방지.
Cloudflare 네이티브 기능으로 애플리케이션 코드 오버헤드 없이 rate limiting 구현.

## 결정

Cloudflare Workers Native Rate Limiting API (`RateLimit` binding) 선택. ADR-013 참조.

### 바인딩 구성

| 바인딩 | 엔드포인트 | 한도 | 키 |
|---|---|---|---|
| `AUTH_RATE_LIMITER` | `POST /auth/login` | 10회/60초 | `login:<cf-connecting-ip>` |
| `MCP_RATE_LIMITER` | `/mcp` | 60회/60초 | `mcp:<cf-connecting-ip>` |

## 트러블슈팅

### 1. `wrangler types` optional 바인딩 문제

`wrangler types`가 `RateLimit` 바인딩을 optional(`?`)로 생성:
```ts
AUTH_RATE_LIMITER?: RateLimit;  // ← optional
```
런타임에서는 항상 주입되지만, TypeScript가 `possibly undefined` 에러 발생.

**해결**: `env.ts`에 `RequiredRuntimeBindings` 인터페이스 추가하여 intersect:
```ts
interface RequiredRuntimeBindings {
  AUTH_RATE_LIMITER: RateLimit;
  MCP_RATE_LIMITER: RateLimit;
}
export type AppEnv = {
  Bindings: Env & SecretBindings & RequiredRuntimeBindings;
  ...
};
```

### 2. `/mcp` fetch async 전환

`/mcp` 분기에서 `await env.MCP_RATE_LIMITER.limit()` 호출을 위해,
Worker `fetch()` 시그니처를 `Response | Promise<Response>` → `async (...): Promise<Response>` 로 변경.

### 3. shared 패키지 dist 재빌드

`TOO_MANY_REQUESTS` 를 `ApiErrorCode` 유니온에 추가했지만,
`tsconfig.base.json`에 `paths` 매핑이 없어 `@studyops/shared`가 `dist/`로 해석됨.
`npm run build -w packages/shared` 로 dist 재생성 필요.

### 4. `feat/rate-limiting` 브랜치를 `origin/main` 기반으로 재생성

초기 작업이 `env-separation-d1-isolation` (구 브랜치) 위에 있었음.
PR #11 (logging)이 `env-separation-d1-isolation`에 머지되면서 분기 상태가 복잡해짐.
`origin/main` 기반 새 브랜치 생성 후 stash pop으로 변경사항 이동 — 충돌 없음.

## 산출물

### 코드 변경

| 파일 | 변경 |
|---|---|
| `middleware/rate-limit.ts` | `authLoginRateLimit` 미들웨어 — `AUTH_RATE_LIMITER.limit()` 호출, 실패 시 `HttpError(429, 'TOO_MANY_REQUESTS')` |
| `middleware/rate-limit.test.ts` | 3개 단위 테스트 (성공, 429, IP fallback) |
| `auth/routes.ts` | `POST /login` 에 `authLoginRateLimit` 미들웨어 적용 |
| `index.ts` | `/mcp` 분기에 inline rate-limit check 추가, `fetch` async 전환 |
| `env.ts` | `RequiredRuntimeBindings` 인터페이스 추가 |
| `wrangler.jsonc` | `ratelimits` array에 두 바인딩 추가 |
| `packages/shared/src/errors.ts` | `ApiErrorCode`에 `'TOO_MANY_REQUESTS'` 추가 |

### 테스트

| 파일 | 테스트 수 | 검증 |
|---|---|---|
| `middleware/rate-limit.test.ts` | 3 | 성공 시 200 + key 검증, 실패 시 429 + TOO_MANY_REQUESTS, IP 미제공 시 'unknown' fallback |

## 검증

- `npm run typecheck` → 0 errors
- `npm run test:server` → 30/30 tests passed (기존 27 + rate-limit 3)
