---
id: adr-013
title: Rate Limiting — Cloudflare Native RateLimit Binding 도입
status: accepted
date: 2026-07-26
supersededBy: null
tags: [server, security, rate-limiting, cloudflare]
---

# ADR-013: Rate Limiting — Cloudflare Native RateLimit Binding 도입

## Context

`POST /auth/login` 은 Toss OAuth2 인가코드를 받아 세션 토큰을 발급하는 엔드포인트다.
인가코드 검증을 위해 Toss 파트너 API를 호출하므로, 무차별 대입(brute-force) 시도가
Toss API 호출 한도를 소진하거나 비정상 트래픽을 유발할 수 있다.

`/mcp` 엔드포인트는 Sisyphus(AI agent)가 D1 데이터를 read-only로 조회하는 MCP 서버다.
Bearer token 인증이 있지만, 토큰 유출 시 API 남용을 막기 위해 rate limiting이 필요하다.

HARNESS §3.2("모든 외부 호출은 HttpError로 정규화")에 따라, rate limit 초과 시
`HttpError(429, 'TOO_MANY_REQUESTS')` 로 정규화하여 기존 에러 파이프라인을 따른다.

## Decision

**Cloudflare Workers Native Rate Limiting API(`RateLimit` binding)를 도입한다.**

### 바인딩 구성 (`wrangler.jsonc`)

| 바인딩 이름 | 적용 엔드포인트 | 한도 | 목적 |
|---|---|---|---|
| `AUTH_RATE_LIMITER` | `POST /auth/login` | 10회/60초 (IP당) | 무차별 로그인 시도 차단 |
| `MCP_RATE_LIMITER` | `/mcp` | 60회/60초 (IP당) | MCP API 남용 방지 |

### 적용 방식

1. **Hono 미들웨어** (`middleware/rate-limit.ts`): `authLoginRateLimit` — `/auth/login` 라우트에 체인으로 삽입. `c.env.AUTH_RATE_LIMITER.limit({ key })` 호출 후 `success: false` 시 `HttpError(429)` throw.

2. **`/mcp` 인라인 체크** (`index.ts`): `/mcp` 는 Hono 체인 밖(DurableObject 직접 라우팅)이므로, `fetch()` 내부에서 `env.MCP_RATE_LIMITER.limit()` 을 직접 호출. 실패 시 `formatHttpError()` 로 429 응답 생성.

### IP 식별

`cf-connecting-ip` 헤더를 키로 사용. 이 헤더는 Cloudflare edge가 신뢰할 수 있는
클라이언트 IP를 주입하므로 변조가 불가능하다.

### ApiErrorCode 확장

`packages/shared/src/errors.ts` 의 `ApiErrorCode` 유니온에 `'TOO_MANY_REQUESTS'` 추가.
기존 `HttpError` → `formatHttpError` → `ApiErrorResponse` 파이프라인을 그대로 사용.

## Consequences

### 긍정
- **새 npm 의존성 없음** — Cloudflare 플랫폼 네이티브 기능. HARNESS §4 rule 7(새 패키지 ADR) 해당 없음
- **에지 레벨 처리** — Rate limiting이 Workers 런타임에서 처리되어 애플리케이션 코드 오버헤드 최소
- **기존 에러 파이프라인 재사용** — `HttpError(429)` → `errorHandler` → `ApiErrorResponse` 포맷 일관성 유지
- **테스트 용이** — `vi.fn()` 으로 `limit()` 호출을 모킹하여 단위 테스트 가능 (ADR-012 Vitest 인프라 활용)

### 부정
- **`worker-configuration.d.ts` optional 바인딩** — `wrangler types`가 `RateLimit` 바인딩을 optional(`?`)로 생성. `env.ts`에서 `RequiredRuntimeBindings` 인터페이스로 intersect하여 필수로 강제 (런타임에서는 항상 주입됨)
- **`fetch()` async 전환** — `/mcp` 분기에서 `await env.MCP_RATE_LIMITER.limit()` 호출을 위해 `fetch` 시그니처를 `Response | Promise<Response>` → `async (...): Promise<Response>` 로 변경

### 중립
- Rate limit 한도(10/60, 60/60)는 초기값. 운영 데이터 기반으로 조정 필요

## Alternatives Considered

### 커스텀 D1 기반 rate limiter
- **장점**: 세밀한 제어 (사용자별, 엔드포인트별 동적 한도)
- **기각**: D1 write 부하 증가, 구현 복잡도, Cloudflare 네이티브 기능이 더 효율적

### Cloudflare WAF Rate Limiting Rules
- **장점**: 대시보드에서 관리, 애플리케이션 코드 불필요
- **기각**: Workers 로직과 분리되어 디버깅 어려움, 조건 매칭 제약, 무료 플랜 제한

### 커스텀 KV/Cache 기반
- **장점**: 유연한 카운팅 알고리즘 (sliding window, token bucket)
- **기각**: KV eventual consistency로 정확한 카운팅 불가, 추가 인프라 관리 부담

## References

- Cloudflare Rate Limiting: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- HARNESS.md §3.2 (외부 호출 HttpError 정규화)
- ADR-012 (Vitest — rate-limit.test.ts 모킹 패턴)
