---
id: 2026-07-26-env-separation
title: 환경 분리 + D1 격리 + CI/CD 배포 게이트 + MCP 통합
type: infra
status: shipped
startedAt: 2026-07-26T15:00:00+09:00
shippedAt: 2026-07-26T16:15:00+09:00
sessionIds:
  - ses_... (env-separation-d1-isolation)
  - bg_... (background tasks)
relatedDecisions:
  - adr-006
  - adr-007
  - adr-008
  - adr-009
touchedFiles:
  - apps/server/wrangler.jsonc
  - apps/server/worker-configuration.d.ts
  - apps/server/src/env.ts
  - apps/server/src/boot-check.ts
  - apps/server/src/index.ts
  - apps/server/src/middleware/error.ts
  - apps/server/src/auth/toss.ts
  - apps/server/package.json
  - apps/server/.dev.vars.example
  - apps/server/scripts/secrets-check.mjs
  - apps/server/scripts/db-backup-prod.sh
  - package.json
  - .gitignore
  - .github/workflows/ci.yml
  - .github/workflows/deploy.yml
  - .github/workflows/migrate-prod.yml
  - docs/wiki/src/content/decisions/adr-006-env-separation-strategy.md
  - docs/wiki/src/content/decisions/adr-007-d1-dev-prod-isolation.md
  - docs/wiki/src/content/decisions/adr-008-deploy-gates-github-actions.md
  - docs/wiki/src/content/decisions/adr-009-mcp-integration.md
  - docs/wiki/src/content/episodes/2026-07-26-env-separation.md
  - HARNESS.md
linearIssue: null
githubPR: null
tags: [infra, environment-separation, d1, ci-cd, github-actions, mcp, adr]
summary: wrangler.toml → wrangler.jsonc 마이그레이션, dev/prod 환경 분리, D1 인스턴스 격리, GitHub Actions CI/CD 파이프라인 구축, MCP 화이트리스트 확장. ADR 4건 작성.
---

## 목표

1. `wrangler.toml` → `wrangler.jsonc` 마이그레이션 + `env.production` 블록으로 dev/prod 환경 완전 분리
2. D1 인스턴스 2개 운영 (dev/prod 격리) — 무료 tier 유지
3. GitHub Actions CI/CD — PR typecheck, `workflow_dispatch` 수동 배포 게이트, prod D1 마이그레이션 전용 워크플로우
4. 부트 타임 fail-fast 검증 (`boot-check.ts`) — TOSS_AUTH_MODE=dev가 prod에 배포되는 것을 원천 차단
5. ADR 4건 (env 전략 / D1 격리 / 배포 게이트 / MCP 통합) 작성
6. HARNESS.md §3.4 MCP 화이트리스트 업데이트

## 설계 결정

### wrangler.toml → wrangler.jsonc

- wrangler v4.x 권장 포맷. `$schema` 참조로 IDE 자동완성 지원.
- `env.production` 블록에 Worker 이름(`studyops-server-production`), vars(TOSS_AUTH_MODE=live 강제), D1 바인딩 분리
- JSONC 주석(`//`) 사용 — config 필드 설명 inline 문서화

### D1 격리 (2개 인스턴스)

- `studyops-db-dev` (기존 UUID a0459919..., 명칭만 변경) — dev용
- `studyops-db-prod` (신규 UUID ae6a0663..., region APAC) — prod용
- 동일 스키마, 동일 마이그레이션 디렉터리 — apply 대상만 다름
- `wrangler d1 migrations apply studyops-db-prod --remote --env production`으로 적용

### 배포 게이트 (GitHub Actions)

- ci.yml: PR/push → typecheck + build only (no deploy)
- deploy.yml: workflow_dispatch → secrets-check → wrangler deploy (env 선택)
- migrate-prod.yml: workflow_dispatch + confirm="yes" 필수 → prod D1 migration
- secrets-check가 필수 secret 누락 감지 → 배포 중단

### Boot Check (fail-fast)

- `src/boot-check.ts`: `assertBootEnvironment()` — `ENVIRONMENT=production` + `TOSS_AUTH_MODE=dev` → throw
- SESSION_SECRET 검증 (누락, 32자 미만) → throw
- Hono lazy middleware로 1회 실행 후 캐시

### MCP 화이트리스트

- 기존(codegraph, context7, playwright, linear) 유지
- notion MCP 추가 (위키 문서 생성/업데이트용)
- Cloudflare Worker-as-MCP-Server는 Phase 4+로 연기

## 변경 내역

### 마이그레이션
- `wrangler.toml` → `wrangler.jsonc`: 전체 config 변환, env.production 블록 추가
- `worker-configuration.d.ts`: `wrangler types` 재생성 (Env + ProductionEnv 타입 자동 생성)
- `src/env.ts`: 수동 Bindings 제거, `Env & SecretBindings` intersect 방식으로 변경
- `@cloudflare/workers-types` 제거 → tsconfig types: [], worker-configuration.d.ts include

### 새로 생성
- `apps/server/wrangler.jsonc` — JSONC 포맷, dev/prod env 분리, D1 prod 바인딩
- `apps/server/src/boot-check.ts` — 부트 타임 fail-fast 검증
- `apps/server/src/middleware/error.ts` — 구조화 JSON 로깅 (requestId, method, path, status, code, stack, userKey)
- `apps/server/scripts/secrets-check.mjs` — `wrangler secret list --env` 검증 스크립트
- `apps/server/scripts/db-backup-prod.sh` — D1 export 백업 쉘 스크립트
- `.github/workflows/ci.yml` — PR/push 타입체크+빌드
- `.github/workflows/deploy.yml` — 수동 배포 게이트
- `.github/workflows/migrate-prod.yml` — prod D1 마이그레이션 전용
- `docs/wiki/src/content/decisions/adr-006-env-separation-strategy.md`
- `docs/wiki/src/content/decisions/adr-007-d1-dev-prod-isolation.md`
- `docs/wiki/src/content/decisions/adr-008-deploy-gates-github-actions.md`
- `docs/wiki/src/content/decisions/adr-009-mcp-integration.md`

### 수정
- `apps/server/package.json` — env별 스크립트 (dev, dev:prod-preview, deploy:production, db:apply:dev/prod, secrets:check, db:list-migrations)
- `package.json` (루트) — deploy:production, db:apply:dev/prod, types:server, secrets:check 스크립트 노출
- `apps/server/src/index.ts` — boot-check lazy middleware 적용, 에러 시 500 반환
- `apps/server/src/auth/toss.ts` — `import { Bindings }` → `import { AppEnv }`, `AppEnv['Bindings']`
- `.gitignore` — `backups/` 경로 추가
- `apps/server/.dev.vars.example` — ENVIRONMENT 문서화

## 검증

- [x] `npm run typecheck` 전체 통과 (shared + server + client 각 tsc --noEmit)
- [x] `wrangler types` 재생성 — 에러 없음
- [x] `wrangler d1 migrations apply studyops-db-prod --remote --env production` — 0000_initial.sql ✅
- [x] `wrangler deploy --dry-run` — 설정 검증
- [x] ADR 4건 작성 완료
- [x] GitHub Actions 3개 workflow 작성 완료
- [x] Boot check 로직 review 완료 (HARNESS §6.3 일관성)
- [ ] secrets-check 실행 (로컬에 wrangler 로그인 세션 필요)
- [ ] 배포 테스트 (실제 workflow_dispatch 실행)

## 메모 / 다음에 할 것

### Phase 4 (MCP 고도화)
- Cloudflare Worker가 MCP 서버로 동작: D1 데이터 MCP resource 노출
- Agent가 Worker MCP tool로 직접 DB 조작

### 운영
- `scripts/db-backup-prod.sh` cron 등록 (Orca automation 또는 launchd)
- GitHub Actions에 CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID secrets 등록
- Wiki 사이트 Cloudflare Pages 배포

### 당면 과제
- worker-configuration.d.ts가 551KB로 큼 — wrangler types가 생성하는 불가피한 크기
- JSONC 주석 `//` 가 wrangler 경고 유발 — 기능상 문제는 없음
