---
id: 2026-07-26-client-sdk
title: Client SDK — @studyops/client-sdk 패키지 추출
type: client
status: shipped
startedAt: 2026-07-26T23:15:00+09:00
shippedAt: 2026-07-26T23:45:00+09:00
sessionIds: []
relatedDecisions:
  - adr-014
touchedFiles:
  - packages/client-sdk/package.json
  - packages/client-sdk/tsconfig.json
  - packages/client-sdk/src/client.ts
  - packages/client-sdk/src/index.ts
  - packages/shared/src/rounds.ts
  - apps/client/src/lib/api-client.ts
  - apps/client/src/context/SessionContext.tsx
  - apps/client/src/lib/logger/transport.ts
  - apps/client/src/pages/LoginPage.tsx
  - apps/client/src/pages/StudiesPage.tsx
  - apps/client/src/pages/StudyDetailPage.tsx
  - apps/client/src/pages/RoundDetailPage.tsx
  - apps/client/src/pages/SubmissionCreatePage.tsx
  - apps/client/src/pages/ReminderPage.tsx
  - apps/client/src/pages/admin/LogsPage.tsx
  - apps/client/package.json
  - package.json
  - docs/wiki/src/content/decisions/adr-014-client-sdk-extraction.md
  - docs/wiki/src/content/episodes/2026-07-26-client-sdk.md
linearIssue: null
githubPR: null
tags: [client, sdk, monorepo, refactor]
summary: "클라이언트 API 레이어를 @studyops/client-sdk 패키지로 추출. StudyOpsClient 클래스(namespaced API) 도입. RoundSummary 타입을 shared로 이동. 9개 파일 import 마이그레이션 완료. typecheck + build 전 패키지 통과."
---

## 목표

클라이언트 앱의 API 호출 레이어(`src/api/` 5개 파일)를 별도 패키지로 추출하여
재사용 가능한 SDK로 만들고, 클라이언트 앱은 UI에만 집중하도록 분리.

## 결정

`@studyops/client-sdk` 패키지를 `packages/client-sdk/`에 생성. ADR-014 참조.

### SDK 설계

- `StudyOpsClient` 클래스 — 생성자에서 `baseUrl` + `tokenStore` 주입
- Namespaced API: `auth`, `studies`, `rounds`, `logs`
- `ApiError`, `TokenStore`, `createSessionTokenStore` 재사용 가능한 타입/유틸 export

### 클라이언트 통합

- `apps/client/src/lib/api-client.ts` — 싱글톤 인스턴스
- 9개 파일 import 경로 마이그레이션 (`../api/*` → `../lib/api-client`)
- 기존 `apps/client/src/api/` 디렉토리 삭제

## 트러블슈팅

### 1. `@studyops/client-sdk` 모듈 미발견

`npm install` 전에는 workspace 심볼릭 링크가 생성되지 않아 TypeScript가
모듈을 찾지 못함. `catch (e)` 블록에서 `e instanceof ApiError`가
타입 좁히기를 하지 못해 20+개 `'e' is of type 'unknown'` 에러 발생.

**해결**: `npm install` 실행 → workspace 심볼릭 링크 생성 → 모든 에러 해결.

### 2. `RoundSummary` 타입 위치

기존 `apps/client/src/api/studies.ts`에 정의되어 있었으나, 서버 라우트
(`/studies/:id/rounds/status`)에서도 반환하는 타입.

**해결**: `packages/shared/src/rounds.ts`로 이동. shared 재빌드 후 모든
패키지에서 사용 가능.

### 3. Vitest 테스트 환경 오류 (기존 문제)

`npm run test:server` 실행 시 `this.getMockerRegistry(...).getById is not a function`
에러 발생. 서버 `node_modules/vitest` v4.1.10과 `vitest-pool-workers`의
호환성 문제.

**확인**: `git stash` 후 clean 상태에서도 동일 에러 발생 → 본 작업과 무관한
기존 문제. 별도 이슈로 분리 필요.

## 산출물

### 새 패키지

| 파일 | 내용 |
|---|---|
| `packages/client-sdk/package.json` | `@studyops/client-sdk`, dep: `@studyops/shared` |
| `packages/client-sdk/tsconfig.json` | `extends ../../tsconfig.base.json`, outDir: `./dist` |
| `packages/client-sdk/src/client.ts` | `ApiError`, `TokenStore`, `createSessionTokenStore`, `createFetchFn`, `FetchFn` |
| `packages/client-sdk/src/index.ts` | `StudyOpsClient` class + 모든 API 타입 re-export |

### 코드 변경

| 파일 | 변경 |
|---|---|
| `packages/shared/src/rounds.ts` | `RoundSummary` 인터페이스 추가 |
| `apps/client/src/lib/api-client.ts` | 신규 — `apiClient` 싱글톤 + `ApiError` re-export |
| `apps/client/src/context/SessionContext.tsx` | `apiClient.auth.*`, `apiClient.getToken/setToken/clearToken` 사용 |
| `apps/client/src/lib/logger/transport.ts` | `apiClient.getToken()` 사용 |
| 7개 페이지 컴포넌트 | `apiClient.{auth,studies,rounds,logs}.*` 메서드 호출로 마이그레이션 |
| `apps/client/package.json` | `@studyops/client-sdk` 의존성 추가 |
| `package.json` | `build:client-sdk`, `typecheck:client-sdk` 스크립트 추가 |

### 삭제

| 파일 | 사유 |
|---|---|
| `apps/client/src/api/client.ts` | SDK로 이동 |
| `apps/client/src/api/auth.ts` | SDK로 이동 |
| `apps/client/src/api/studies.ts` | SDK로 이동 |
| `apps/client/src/api/rounds.ts` | SDK로 이동 |
| `apps/client/src/api/logs.ts` | SDK로 이동 |

## 검증

- `npm run typecheck` → 0 errors (shared + client-sdk + server + client)
- `npm run build` → 4 패키지 모두 빌드 성공
- `npm run test:server` → 기존 문제(vitest v4 호환성)로 인해 실패. 본 작업과 무관.
