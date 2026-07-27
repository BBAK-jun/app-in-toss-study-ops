---
id: adr-014
title: Client SDK — @studyops/client-sdk 패키지 추출
status: accepted
date: 2026-07-26
supersededBy: null
tags: [client, architecture, monorepo, sdk]
---

# ADR-014: Client SDK — @studyops/client-sdk 패키지 추출

## Context

클라이언트 앱(`apps/client`)의 API 호출 레이어가 `src/api/` 디렉토리에 5개 파일로
분산되어 있었다 (`client.ts`, `auth.ts`, `studies.ts`, `rounds.ts`, `logs.ts`).
이 코드는 클라이언트 앱에만 사용 가능했고, 향후 별도 CLI 도구나 다른 클라이언트
앱에서 API를 호출하려면 동일한 코드를 복제해야 햔다.

또한 `RoundSummary` 타입이 `apps/client/src/api/studies.ts`에 정의되어 있었으나,
서버 라우트(`/studies/:id/rounds/status`)에서도 반환하는 타입이므로 `@studyops/shared`에
있어야 했다.

HARNESS §4 rule 7("package.json에 새 패키지 추가 전 ADR 필수")에 따라 본 ADR을 작성한다.

## Decision

**`@studyops/client-sdk` 패키지를 `packages/client-sdk/`에 추출한다.**

### 패키지 구성

```
packages/client-sdk/
├── package.json          # @studyops/client-sdk, dep: @studyops/shared
├── tsconfig.json         # extends ../../tsconfig.base.json
└── src/
    ├── client.ts         # ApiError, TokenStore, createFetchFn, createSessionTokenStore
    └── index.ts          # StudyOpsClient class (namespaced API)
```

### API 설계

`StudyOpsClient` 클래스 — 생성자 주입 기반의 namespaced 메서드:

```typescript
const client = new StudyOpsClient({ baseUrl: 'https://api.example.com' });

// Auth
await client.auth.login(authorizationCode, referrer);
await client.auth.getMe();
await client.auth.logout();

// Studies
await client.studies.create(input);
await client.studies.list();
await client.studies.get(id);

// Rounds
await client.rounds.getStatus(roundId);
await client.rounds.createSubmission(roundId, input);

// Logs
await client.logs.fetch(params);

// Token management
client.setToken(token);
client.getToken();
client.clearToken();
```

### 클라이언트 앱 통합

`apps/client/src/lib/api-client.ts` — 싱글톤 인스턴스:
```typescript
export const apiClient = new StudyOpsClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
});
```

9개 파일이 `../api/*` import에서 `{ apiClient, ApiError } from '../lib/api-client'`로 마이그레이션.

### `RoundSummary` 타입 이동

`apps/client/src/api/studies.ts`에 정의된 `RoundSummary` 인터페이스를
`packages/shared/src/rounds.ts`로 이동. 서버 라우트도 반환하는 타입이므로
공유 패키지가 적절한 위치.

## Consequences

### 긍정
- **재사용성** — 동일한 SDK를 CLI, 다른 클라이언트 앱, 테스트 유틸리티에서 사용 가능
- **타입 안전성** — 모든 API 호출이 `@studyops/shared` 타입 기반으로 컴파일 타임 검증
- **단일 책임** — API 호출 로직이 한 패키지에 집중. 클라이언트 앱은 UI에만 집중
- **토큰 관리 일원화** — `TokenStore` 인터페이스로 추상화. sessionStorage 기본 구현체 제공

### 부정
- **빌드 의존성 추가** — `build:client-sdk` 스텝이 빌드 체인에 추가. shared → client-sdk → client 순서 보장 필요
- **클라이언트 앱 import 경로 변경** — 9개 파일의 import 경로 수정 필요 (마이그레이션 완료)

### 중립
- SDK는 브라우저 `fetch` + `sessionStorage` API에 의존. Node.js 환경에서는 별도 `TokenStore` 구현체 주입 필요

## Alternatives Considered

### 클라이언트 앱 내 API 레이어 유지
- **장점**: 변경 범위 최소, 추가 패키지 불필요
- **기각**: 코드 재사용 불가, 향후 CLI/다른 클라이언트 추가 시 복제 필요

### OpenAPI 코드 생성 (openapi-typescript-codegen)
- **장점**: 스키마 기반 자동 생성, 타입 일관성 보장
- **기각**: 현재 서버에 OpenAPI 스키마가 없음. 도입 오버헤드 대비 현재 규모가 작음 (MVP)

### tRPC
- **장점**: 엔드투엔드 타입 안전성, 스키마 정의 불필요
- **기각**: 서버가 Hono(Workers) 기반. tRPC는 Hono와 통합 가능하지만 런타임 오버헤드 증가

## References

- HARNESS.md §4 rule 7 (새 패키지 ADR 필수)
- ADR-003 (Shared types monorepo)
- ADR-001 (Cloudflare Workers + D1)
