---
id: adr-006
title: wrangler.jsonc 환경 분기 + ENVIRONMENT 바인딩으로 dev/prod 분리
status: accepted
date: 2026-07-26
supersededBy: null
tags: [server, infra, env, dev-prod, wrangler]
---

# ADR-006: wrangler.jsonc 환경 분기 + ENVIRONMENT 바인딩으로 dev/prod 분리

## Context

MVP 1차 완료 시점에서 `apps/server/wrangler.toml`에는 `[env.production]` 섹션이 없었다.
`[vars] TOSS_AUTH_MODE = "dev"` 가 하드코딩되어 있어, `wrangler deploy`를 실행하면
**프로덕션에서도 dev 인증 모드**로 배포되는 취약점이 있었다. (누구나 `dev-<userKey>` 코드로 로그인 가능)

또한 Worker 이름이 분리되지 않아 dev 배포를 해도 prod Worker가 덮어쓰여질 리스크가 있었다.

## Decision

**wrangler.jsonc 에 `env.production` 블록을 추가하고, `ENVIRONMENT` 바인딩을 모든 env에 명시한다.**

### 세부 결정

1. **TOML → JSONC 전환**: `wrangler.toml`을 `wrangler.jsonc`로 마이그레이션 (wrangler v4.x 권장 포맷).
   JSONC는 향후 wrangler 기능(자동 프로비저닝 등)과의 호환성이 더 좋다.

2. **`env.production` 블록**:
   - Worker 이름을 `studyops-server-production`으로 분리 → bare `wrangler deploy`는 dev에만 영향
   - `"TOSS_AUTH_MODE": "live"` 강제 → bare deploy로는 절대 dev 모드가 prod에 배포되지 않음
   - 별도의 `d1_databases` 바인딩 (`studyops-db-prod`, UUID `ae6a0663-...`)

3. **`ENVIRONMENT` 바인딩**:
   - 모든 env에서 `"ENVIRONMENT": "dev" | "production"` 명시
   - auth/toss.ts의 `env.TOSS_AUTH_MODE` 분기와는 별도 — 런타임 부팅 검사(boot-check)에서 사용

4. **런타임 부팅 검사 (fail-fast)**:
   - `src/boot-check.ts` — `ENVIRONMENT=production`인데 `TOSS_AUTH_MODE=dev`면 throw
   - `SESSION_SECRET` 누락 또는 32자 미만이면 throw
   - 이 검사는 비즈니스 로직 분기가 아니라 시작 시점의 결정론적 검증 (HARNESS §6.3 "인증만 분기" 위반 아님)

5. **자동 생성 타입 사용**: `wrangler types`가 생성한 `worker-configuration.d.ts`의 `Env` 인터페이스 사용.
   `@cloudflare/workers-types` 제거. secrets는 `Env & SecretBindings`로 intersect.

## Consequences

### 긍정
- bare `wrangler deploy`로는 prod가 dev 모드로 배포될 수 없음 (설계적 방어)
- `wrangler deploy --env production` 만이 prod 환경에 도달 — 의도적 행위 필요
- `ENVIRONMENT` 바인딩으로 코드에서 `c.env.ENVIRONMENT === 'production'` 분기 가능 (인증 외 다른 용도에도)
- `wrangler types` 생성 타입이 항상 실제 config과 일치 — drif 방지

### 부정
- JSONC의 `//` 주석 문법이 wrangler v4.114에서 일부 경고를 유발할 수 있음 (가벼운 경고, 기능에는 문제 없음)
- 기존 `.dev.vars` 를 사용하던 개발자는 `ENVIRONMENT` 값을 명시하지 않아도 됨 (wrangler.jsonc vars가 우선)

### 중립
- `--env production` 플래그를 빼먹으면 dev에 배포됨 — 의도된 동작이지만 훈련 필요
- Worker 이름이 dev/prod로 분리되어 Cloudflare Dashboard에서 Worker가 2개로 보임

## Alternatives Considered

### wrangler.toml 유지 + env 섹션 추가
- **장점**: 최소 변경
- **기각**: TOML은 일부 wrangler 신기능 미지원 (JSONC 권장). config-schema.json 참조 불가

### Cloudflare API Gateway / separate account
- **장점**: 완전한 계정 분리
- **기각**: MVP 단계에 오버엔지니어링. 운영 비용 2배

### 모든 분기를 ENVIRONMENT 변수로 교체
- **장점**: 단일 분기 지점
- **기각**: HARNESS §6.3 깨짐. 인증은 `TOSS_AUTH_MODE`로, 환경은 `ENVIRONMENT`로 분리

## References

- `HARNESS.md` §3.1 (Stack 고정), §6.3 (인증만 분기)
- Wrangler environments docs: https://developers.cloudflare.com/workers/wrangler/configuration/#environments
- Wrangler JSONC config: https://developers.cloudflare.com/workers/wrangler/configuration/
