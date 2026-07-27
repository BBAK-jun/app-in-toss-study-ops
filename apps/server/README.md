# @studyops/server — Hono on Cloudflare Workers + D1 (Drizzle ORM)

Toss 앱인토스 스터디 운영 자동화 API 서버.

## 환경

| 환경 | Worker 이름 | D1 DB | Analytics Engine | 인증 모드 | 배포 방식 |
|---|---|---|---|---|---|
| **dev** (기본) | `studyops-server` | `studyops-db-dev` (UUID a0459919...) | `studyops_logs_dev` | `TOSS_AUTH_MODE=dev` | `wrangler deploy` |
| **production** | `studyops-server-production` | `studyops-db-prod` (UUID ae6a0663...) | `studyops_logs_prod` | `TOSS_AUTH_MODE=live` (강제) | `wrangler deploy --env production` |

dev는 로컬 개발 및 QA용. prod은 실사용자용. D1 인스턴스와 AE dataset 모두 완전히
분리되어 있으므로 dev에서 마이그레이션/데이터 조작을 해도 prod에 영향 없음.

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
- `MCP_API_TOKEN`: `/mcp` 엔드포인트 Bearer 인증 토큰 (Sisyphus agent용, prod 필수). See ADR-010.

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
npx wrangler secret put MCP_API_TOKEN --env production     # /mcp 인증 (ADR-010)
```

`scripts/secrets-check.mjs`로 등록 상태 확인:

```bash
node scripts/secrets-check.mjs         # dev 확인
node scripts/secrets-check.mjs production  # prod 확인
```

## Analytics Engine (OLAP 메트릭 계층)

Cloudflare Workers Analytics Engine(AE)이 `LOGS_ANALYTICS` binding으로 연결되어 있다.
자세한 설계는 [ADR-013](../wiki/src/content/decisions/adr-013-analytics-engine-olap-tier.md) 참조.

### 역할

- **D1** (`logs` 테이블): 상세 row 보관, 전문 검색, 장기 보관 (ADR-011)
- **AE** (`studyops_logs_*` dataset): 시계열 집계, 제품 분석 메트릭, 빠른 카운트 쿼리

D1이 row-store라 OLAP 집계에 부적합한 한계를 보완.

### Setup (Phase 1)

AE dataset은 **첫 `writeDataPoint()` 호출 시 자동 생성** — 별도 `wrangler analytics-engine` 생성
명령 불필요. wrangler.jsonc에 binding 선언만으로 충분:

```jsonc
"analytics_engine_datasets": [
  { "binding": "LOGS_ANALYTICS", "dataset": "studyops_logs_dev" }
]
```

설정 변경 후 타입 재생성:

```bash
npm run types:server    # wrangler types — LOGS_ANALYTICS: AnalyticsEngineDataset 가 Env에 자동 추가
```

부팅 시 `logBootInfo`가 AE binding 상태를 `analyticsEngine: configured|missing`으로 로깅.
AE는 non-critical best-effort 메트릭이므로 fail-fast 검사 대상이 아님.

### Limits (Free tier)

| 자원 | Free tier | 비고 |
|---|---|---|
| Data points written | 100,000/day | `writeDataPoint()` 1회 호출 = 1 data point |
| Read queries (SQL API) | 10,000/day | ADR-013 Phase 3에서 사용 |
| 보관 기간 | 3개월 (고정) | 장기 보관은 D1 + 향후 R2 파이프라인 |
| 필드 제한 | 1 index + 20 blobs + 20 doubles | per data point |
| Blob 총 크기 | 16 KB | per data point |

Workers Paid($5/mo) 전환 시 10M data points/월 + $0.25/M 추가. 본 프로젝트 트래픽에서는
Free tier로 충분.

### Query (Phase 3)

AE SQL API로 외부에서 집계 쿼리. Worker 내부 route에서 Cloudflare API token으로 호출.

```bash
# Phase 3에서 CF_API_TOKEN secret 추가 예정 (Account Analytics read 권한)
# npx wrangler secret put CF_API_TOKEN --env production
```

엔드포인트: `https://api.cloudflare.com/client/v4/accounts/<account_id>/analytics_engine/sql`

#### 메트릭 API 엔드포인트

인증: 기존 `authMiddleware` 통과. ADR-011 RBAC 한계 승계.

| 메트릭 | Endpoint | 파라미터 |
|---|---|---|
| error rate by event | `GET /admin/logs/metrics?type=error_rate` | `window=1h\|6h\|24h\|7d\|30d` |
| top N events by count | `GET /admin/logs/metrics?type=top_events` | `window`, `limit=1~50` |
| p95 duration by path | `GET /admin/logs/metrics?type=p95_duration` | `window`, `limit` |
| 일별 레벨별 카운트 | `GET /admin/logs/metrics?type=timeseries` | `window` |

응답: `{ type, window, env, limit, cached, rows: AeQueryResultRow[] }`. 30s in-memory 캐시
적용 (AE 샘플링 + 수집 지연 수분이므로 더 짧은 캐시는 무의미).

로컬 dev에서는 CF_API_TOKEN 미설정시 503 ANALYTICS_ENGINE_ERROR 반환 — AE reads는
네트워크 호출이므로 명시적 셋업 필요.

## MCP 서버 (Sisyphus agent용)

`/mcp` 경로에 MCP(Model Context Protocol) 서버가 통합되어 있음 (ADR-010).
Sisyphus(AI agent)가 read-only로 D1 데이터를 조회.

### 인증

Bearer token (`MCP_API_TOKEN` secret). prod에서는 boot-check가 존재 검증.

```bash
# 로컬 dev — .dev.vars 에 MCP_API_TOKEN 설정
echo "MCP_API_TOKEN=dev-token-here" >> .dev.vars

# prod
npx wrangler secret put MCP_API_TOKEN --env production
```

### 도구 (read-only)

| 도구 | 설명 | 파라미터 |
|---|---|---|
| `list_studies` | 전체 스터디 목록 (operator view) | 없음 |
| `get_study` | 단일 스터디 상세 (참여자/회차 수 포함) | `studyId: string` |
| `list_rounds` | 스터디의 회차 목록 | `studyId: string` |
| `get_round_status` | 회차 제출 현황 (제출률, 미제출자) | `roundId: string` |
| `list_low_submission_rounds` | 저제출 회차 대시보드 | `maxRate?: number` (기본 0.5) |

### 클라이언트 설정 (Sisyphus)

```
MCP endpoint: https://<worker-domain>/mcp
Authorization: Bearer <MCP_API_TOKEN>
Transport: Streamable HTTP
```

## 구조

```
src/
├── index.ts              # 엔트리 — { fetch } handler (/mcp → DO, 나머지 → Hono app)
├── boot-check.ts         # 부트 타임 fail-fast 검증 (env 조합, secret 강도, MCP_API_TOKEN)
├── env.ts                # AppEnv 타입 (Env & SecretBindings intersect)
├── mcp/                  # MCP 서버 (StudyOpsMcpAgent DO, read-only tools). ADR-010.
├── auth/                 # Toss OAuth2 / JWT 인증
├── db/                   # Drizzle 스키마 + 마이그레이션
├── lib/                  # 공통 유틸리티 (HttpError, response helpers, logger)
├── middleware/           # Hono 미들웨어 (error, auth guard)
├── routes/               # Hono 라우트 그룹
└── services/             # 비즈니스 로직 (option: bot, study, etc.)
```

D1 연결은 wrangler 바인딩 (`c.env.DB`)으로 자동 주입됨.
로컬 개발 시 `.wrangler/state/v3/d1/` 의 sqlite 파일 사용.

Analytics Engine도 wrangler 바인딩 (`c.env.LOGS_ANALYTICS`)으로 주입됨.
dataset은 첫 write 시 자동 생성됨. ADR-013 Phase 1은 binding 선언만으로 완료.
