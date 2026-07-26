---
id: 2026-07-26-test-infra-vitest
title: 테스트 인프라 도입 — Vitest + @cloudflare/vitest-pool-workers
type: server
status: shipped
startedAt: 2026-07-26T22:00:00+09:00
shippedAt: 2026-07-26T22:40:00+09:00
sessionIds:
  - ses_0616d9206ffe3c3ZHA6SoMWbSX
relatedDecisions:
  - adr-012
touchedFiles:
  - apps/server/package.json
  - apps/server/vitest.config.mts
  - apps/server/tsconfig.json
  - apps/server/src/lib/http-error.test.ts
  - apps/server/src/middleware/cors.test.ts
  - apps/server/src/middleware/request-id.test.ts
  - apps/server/src/routes/health.test.ts
  - package.json
  - .github/workflows/ci.yml
  - docs/wiki/src/content/decisions/adr-012-test-infra-vitest.md
  - docs/wiki/src/content/episodes/2026-07-26-test-infra-vitest.md
linearIssue: null
githubPR: null
tags: [server, testing, vitest, miniflare, ci, adr, deps]
summary: "Vitest 4.x + @cloudflare/vitest-pool-workers 0.18.8 도입. v4 API 변경(defineWorkersConfig → cloudflareTest 플러그인) 대응. 단위 테스트 3개 + 통합 테스트 1개(/ready D1 검증)로 26개 테스트 통과. CI에 test 단계 추가."
---

## 목표

HARNESS §4 rule 3("테스트 삭제 금지")의 전제인 테스트 코드가 0개인 상황 해결.
PR #6에서 추가한 미들웨어(cors, request-id, error-handler)와 /ready 딥 헬스체크를
자동 검증할 수 있는 기반 마련.

## 결정

사용자가 "Vitest + pool-workers로 통합 테스트까지" 선택 → ADR-012 작성.

### 새 의존성 (HARNESS §4 rule 7 — ADR 필수)

| 패키지 | 버전 | 용도 | 번들 영향 |
|---|---|---|---|
| `vitest` | 4.1.10 | 테스트 러너 | 0 (devDependency) |
| `@cloudflare/vitest-pool-workers` | 0.18.8 | Workers 환경 시뮬레이션 | 0 (devDependency) |
| `miniflare` | 4.20260722.0 | 로컬 D1/KV runtime | 0 (peerDep) |

## 트러블슈팅

### 1. `Missing "./config" specifier` 에러

`defineWorkersConfig` 를 `@cloudflare/vitest-pool-workers/config` 에서 import → 실패.
v4에서 `./config` export 경로가 제거됨.

**해결**: codemod(`vitest-v3-to-v4.mjs`) 분석 → 새 API는 `cloudflareTest` 플러그인 방식:
```ts
// v3 (deprecated): import { defineWorkersConfig } from '.../config'
// v4: cloudflareTest 플러그인을 vitest/plugins 에 추가
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' }, ... })],
  test: { include: ['src/**/*.test.ts'] },
});
```

### 2. ESM/CJS 충돌 — `This package is ESM only`

루트 package.json에 `"type": "module"` 없음 → Vite가 vitest.config.ts 를 CJS로 로드 시도 →
`@cloudflare/vitest-pool-workers` (ESM only) import 실패.

**해결**: `vitest.config.ts` → `vitest.config.mts` 로 확장자 변경.
`.mts` 확장자가 강제 ESM 로딩을 보장.

### 3. `Cannot find module 'cloudflare:test'` (tsc 에러)

`cloudflare:test` 모듈 선언이 TypeScript에 없음. pool-workers가 런타임에 주입하지만
tsc는 모듈 타입을 모름.

**해결**: `tsconfig.json` 의 `types: []` → `types: ["@cloudflare/vitest-pool-workers/types"]`
변경. 패키지가 제공하는 `cloudflare-test.d.ts` 모듈 선언을 활성화.

### 4. `ALLOWED_ORIGINS` 리터럴 타입 충돌

`wrangler types` 가 wrangler.jsonc `env.production.vars.ALLOWED_ORIGINS` 값을
리터럴 타입(`"https://apps-in-toss.toss.im"`)으로 생성. 테스트에서 임의 origin 문자열
주입 시 타입 에러.

**해결**: cors.test.ts 의 `makeEnv` overrides 타입에서 `ALLOWED_ORIGINS` 만 `string`으로 넓힘:
```ts
type TestEnvOverrides = Omit<Partial<AppEnv['Bindings']>, 'ALLOWED_ORIGINS'> & {
  ALLOWED_ORIGINS?: string;
};
```

## 산출물

### 테스트 파일 (26 tests, 4 files)

| 파일 | 테스트 수 | 종류 | 검증 대상 |
|---|---|---|---|
| `lib/http-error.test.ts` | 7 | 단위 | formatHttpError: HttpError 분기(status/code/body), unknown 분기(500/INTERNAL_ERROR), 구조화 로그 |
| `middleware/cors.test.ts` | 10 | 단위 | dev origin 허용/차단, prod whitelist, OPTIONS preflight, Vary 헤더 |
| `middleware/request-id.test.ts` | 5 | 단위 | cf-ray 우선순위, UUIDv4 생성, X-Request-Id 헤더 |
| `routes/health.test.ts` | 4 | **통합** | SELF.fetch → /health 200, /ready D1 SELECT 1 실제 실행 |

### 통합 테스트 패턴

`SELF.fetch('http://localhost/health')` 가 Worker 전체 파이프라인 통과:
boot-check → 미들웨어 → 라우트 → D1 쿼리.
miniflare가 wrangler.jsonc 의 D1 binding을 로컬 sqlite로 제공.

## 검증

- `npm run test:server` → 26/26 tests passed (24s)
- `npm run typecheck:server` → 0 errors
- CI `ci.yml` 에 `npm run test:server` 단계 추가 (typecheck 이후, build 이전)
