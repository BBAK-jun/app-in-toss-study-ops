# @studyops/server — Hono on Cloudflare Workers + D1 (Drizzle ORM)

Toss 앱인토스 스터디 운영 자동화 API 서버.

## 환경

| 환경 | Worker 이름 | D1 DB | 인증 모드 | 배포 방식 |
|---|---|---|---|---|
| **dev** (기본) | `studyops-server` | `studyops-db-dev` (UUID a0459919...) | `TOSS_AUTH_MODE=dev` | `wrangler deploy` |
| **production** | `studyops-server-production` | `studyops-db-prod` (UUID ae6a0663...) | `TOSS_AUTH_MODE=live` (강제) | `wrangler deploy --env production` |

dev는 로컬 개발 및 QA용. prod은 실사용자용. D1 인스턴스가 완전히 분리되어 있으므로
dev에서 마이그레이션/데이터 조작을 해도 prod에 영향 없음.

## 설정

설정은 `wrangler.jsonc` (JSON with Comments)에 정의:

```bash
# wrangler.jsonc 포맷 — tsc --noEmit 대신 wrangler types 로 타입 생성
npx wrangler types
```

환경 변수:

- `TOSS_AUTH_MODE`: `dev` (Toss OAuth2 스킵, 인가코드 `dev-<userKey>` 파싱) | `live` (실제 OAuth2)
- `ENVIRONMENT`: `dev` | `production` (부트 검증에 사용)
- `SESSION_SECRET`: JWT 서명 비밀키 (HS256, 32자 이상)
- `TOSS_API_BASE_URL`: Toss 파트너 API 베이스 URL

## 로컬 개발

```bash
# dev 서버 시작 (wrangler dev, 포트 8787, 로컬 D1)
npm run dev

# prod preview (env.production vars 사용, 로컬 D1)
npm run dev:prod-preview

# 타입체크
npm run typecheck
```

## 배포

```bash
# dev 배포
npm run deploy

# prod 배포 (의도적 행위 필요)
npm run deploy:production

# 배포 전 secrets 검증
npm run secrets:check
npm run secrets:check:production
```

## D1 마이그레이션

```bash
# Drizzle 마이그레이션 SQL 생성
npm run db:generate

# 로컬 sqlite에 적용
npm run db:apply:local

# dev remote D1에 적용
npm run db:apply:dev

# prod remote D1에 적용 (주의 — IRREVERSIBLE)
npm run db:apply:prod

# 마이그레이션 목록 확인
npm run db:list-migrations:dev
npm run db:list-migrations:prod
```

GitHub Actions를 통한 배포는 [ADR-008](../wiki/src/content/decisions/adr-008-deploy-gates-github-actions.md) 참조.
`workflow_dispatch` 수동 트리거로만 배포되며, CI merge → auto-deploy는 하지 않음.

## 프로덕션 D1 백업

```bash
# D1 export (구조 + 데이터)
bash scripts/db-backup-prod.sh
```

출력: `backups/studyops-db-prod-YYYYMMDDHHmmss.sql`

## Secrets

모든 secrets는 `wrangler secret put` 으로 등록:

```bash
# dev secrets
npx wrangler secret put SESSION_SECRET

# prod secrets (--env production)
npx wrangler secret put SESSION_SECRET --env production
npx wrangler secret put TOSS_MTLS_CERT --env production  # live 모드
npx wrangler secret put TOSS_MTLS_KEY --env production    # live 모드
```

`scripts/secrets-check.mjs`로 등록 상태 확인:

```bash
node scripts/secrets-check.mjs         # dev 확인
node scripts/secrets-check.mjs production  # prod 확인
```

## 구조

```
src/
├── index.ts              # Hono 앱 엔트리 (boot-check lazy middleware)
├── boot-check.ts         # 부트 타임 fail-fast 검증 (env 조합, secret 강도)
├── env.ts                # AppEnv 타입 (Env & SecretBindings intersect)
├── auth/                 # Toss OAuth2 / JWT 인증
├── db/                   # Drizzle 스키마 + 마이그레이션
├── lib/                  # 공통 유틸리티 (HttpError, response helpers)
├── middleware/            # Hono 미들웨어 (error, auth guard)
├── routes/               # Hono 라우트 그룹
└── services/             # 비즈니스 로직 (option: bot, study, etc.)
```

D1 연결은 wrangler 바인딩 (`c.env.DB`)으로 자동 주입됨.
로컬 개발 시 `.wrangler/state/v3/d1/` 의 sqlite 파일 사용.
