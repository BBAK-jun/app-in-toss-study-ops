---
id: adr-011
title: CORS Origin 화이트리스트 — ENVIRONMENT 기반 + ALLOWED_ORIGINS var
status: accepted
date: 2026-07-26
supersededBy: null
tags: [server, security, cors, config, http]
---

# ADR-011: CORS Origin 화이트리스트 — ENVIRONMENT 기반 + ALLOWED_ORIGINS var

## Context

ADR-010 도입 이전까지 `/mcp` 분기 이외의 모든 cross-origin 요청은 Hono 기본 `cors()` 미들웨어로 처리되었고,
`origin: '*'` (모든 origin 허용)로 느슨하게 열려 있었다. 인증 헤더(`Authorization`)를 포함하는 API의 경우
`Access-Control-Allow-Origin: *`와 자격증명 헤더가 공존하는 구조는 브라우저 CORS 보장을 약화시키고,
운영 환경에서 디버깅용 origin 노출을 막을 방법이 없다.

HARNESS §3.2 가 "모든 외부 호출은 HttpError로 정규화"하듯, **경계 조건(env, secret, origin)은
부패 방지(barrier)** 로 다뤄야 한다. ARCHITECTURE.md에도 CORS 정책에 대한 명시가 없어
서버 아키텍처 강화(B+C+A 영역)의 일환으로 결정을 기록한다 (HARNESS §6.7 — "회피 말고 결정").

**요구사항**:
- `prod` 환경에서 허용 origin을 명시적으로 통제 (기본 거부)
- `dev` 환경은 설정 없이도 localhost 개발 서버가 동작 (Vite 5173, wrangler 8787)
- 새로운 배포 도메인/WebView origin 추가 시 코드 변경 없이 `ALLOWED_ORIGINS` var만 수정
- `Access-Control-Allow-Origin: *` 사용 금지 — `Authorization` 헤더를 받는 API이므로
  와일드카드는 브라우저가 자격증청 요청을 거부함 (CORS 사양상 충돌)

## Decision

**`middleware/cors.ts` 에서 `ENVIRONMENT` 기반으로 origin을 선택한다.**

### 정책

| 환경 | origin 소스 | 동작 |
|---|---|---|
| `dev` | 하드코딩 세트 | `http://localhost:5173`, `http://localhost:8787` 만 허용. `ALLOWED_ORIGINS` var 무시 |
| `production` | `ALLOWED_ORIGINS` var (콤마 구분) | 매칭되는 origin만 허용. var 미설정 시 빈 리스트 → **모든 cross-origin 거부** |
| same-origin | (Origin 헤더 없음) | 자동 통과 — `Access-Control-*` 헤더 미추가 |

### 구현 (apps/server/src/middleware/cors.ts)

```ts
function pickAllowedOrigin(requestOrigin, env): string | null {
  if (!requestOrigin) return null; // same-origin 또는 non-browser
  if (env.ENVIRONMENT === 'production') {
    const raw = env.ALLOWED_ORIGINS?.trim();
    if (!raw) return null; // prod 미설정 → 모두 거부
    return raw.split(',').map(s => s.trim()).includes(requestOrigin)
      ? requestOrigin : null;
  }
  return DEV_ORIGINS.has(requestOrigin) ? requestOrigin : null;
}
```

`corsMiddleware`는 preflight(`OPTIONS`)와 일반 요청 모두 동일한 origin 판별 함수를 사용.
`Vary: Origin` 헤더를 항상 추가하여 CDN/캐시가 origin별로 응답을 분리 저장하도록 강제.

### 배포 시 주의 (운영자 액션)

`apps/server/wrangler.jsonc`의 `env.production.vars.ALLOWED_ORIGINS` 기본값은
`https://apps-in-toss.toss.im` 하나만 포함. 실제 WebView origin이 다르면
`wrangler.jsonc` 수정 후 재배포로 변경. 코드 수정 불필요.

`ALLOWED_ORIGINS`는 secret이 아닌 `vars` (평문)로 둔다 — origin은 클라이언트가 아는
공개 값이며 secret으로 관리하면 디버깅이 어려워진다.

### Hono cors() 대신 직접 구현한 이유

Hono `cors()` 미들웨어의 `origin` 옵션은 `(origin, c) => string | null` 시그니처를
지원하지만, `c.env`에 접근하려면 클로저 캡처가 필요하고 매 요청마다 미들웨어를
재생성하는 비효율이 생긴다. 직접 구현은 ~30 LOC로 동일한 기능을 더 explicit하게
제공하고, 디버깅 시 미들웨어 외부 동작을 추적하기 쉽다.

## Consequences

### 긍정
- `prod` 환경에서 허용 origin이 명시적으로 통제됨 → 악의적 사이트의 API 호출 차단
- 새 WebView origin 추가 시 코드 변경 없이 `wrangler.jsonc`만 수정
- `Vary: Origin` 추가로 CDN 캐시가 origin별로 분리되어 잘못된 origin 응답이 캐시되는 문제 방지
- `Authorization` 헤더를 쓰는 API가 CORS 사양을 정확히 준수

### 부정
- `prod`에서 `ALLOWED_ORIGINS` 미설정 시 모든 cross-origin 요청이 즉시 거부됨 —
  부트체크에서 검증하지 않으므로 (설정 실수 → 런타임 장애). 다만 `/ready` 딥 헬스체크로
  간접 진단 가능
- 매 요청마다 `ALLOWED_ORIGINS.split(',')` 수행 — 작은 문자열 연산이므로 무시 가능하지만
  트래픽이 크면 Set 캐싱 고려

### 중립
- dev 환경 origin이 하드코딩 → 다른 로컬 개발 포트(예: 3000)에서 테스트 시 코드 수정 필요.
  의도된 제약 — dev 환경 설정을 느슨하게 두면 prod 누출 위험이 증가

## Alternatives Considered

### Hono `cors({ origin: '*' })` 유지
- **장점**: 설정 불필요, 모든 환경 동작
- **기각**: `Authorization` 헤더와 충돌. 보안 약화. HARNESS §6.7 "회피 말고 결정" 위반

### origin을 Cloudflare Workers secret으로 관리
- **장점**: 민감 정보 취급 가능
- **기각**: origin은 공개 값. secret으로 두면 로그/에러 메시지에서 마스킹해야 하고
  디버깅 비용만 증가

### Cloudflare WAF 규칙으로 CORS 차단
- **장점**: 엣지에서 차단, 워커 진입 전 필터
- **기각**: 현재 무료 tier에서는 WAF 규칙 수 제한. 또한 CORS는 브라우저 정책이지
  네트워크 차단이 아님 — WAF는 CORS를 "대체"하지 못하고 보조만 가능

## References

- HARNESS.md §3.2 (외부 호출 정규화), §6.7 (회피 말고 결정)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Cloudflare: CORS on Workers](https://developers.cloudflare.com/workers/examples/cors-header-proxy/)
- ADR-010 (Worker MCP 서버 — `/mcp` 분기에는 CORS 미적용, 자체 Bearer 인증 사용)
