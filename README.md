# StudyOps Bot

스터디 운영 자동화 봇 — Toss 앱인토스 WebView에서 동작하는 모바일 웹앱 + Cloudflare Workers 기반 API 서버.
스터디/회차/참여자를 관리하고, 회차별 제출 현황(제출률)을 추적하며, Discord Webhook으로 리마인드를 발송합니다.

인증은 Toss OAuth2(`appLogin`)를 사용하고, 데이터는 Cloudflare D1(SQLite)에 저장됩니다.

## 구조 (Turborepo + pnpm workspace)

```
studyops-bot/
├── package.json              # 루트 — turbo 실행 + 패키지 매니저(pnpm) 명시
├── pnpm-workspace.yaml       # 워크스페이스 목록 + 네이티브 빌드 허용 목록
├── turbo.json                # 작업 파이프라인 정의 (build/typecheck/test/dev/deploy)
├── .npmrc                    # pnpm 설정 (apps-in-toss 호환성을 위해 hoisted)
├── tsconfig.base.json        # 공유 TS 설정 + @studyops/shared 경로 별칭
├── docs/                     # PRD, 아키텍처 문서, 위키(Astro)
├── packages/
│   └── shared/               # 서버/클라이언트 공용 타입 (DTO, 엔티티, 에러)
└── apps/
    ├── server/               # Hono on Cloudflare Workers + D1 (Drizzle ORM)
    └── client/               # Vite + React + TDS Mobile (앱인토스 WebView)
```

워크스페이스 의존성: `apps/server`와 `apps/client`는 `@studyops/shared: workspace:*`로 연결됨. Turbo가 변경된 워크스페이스만 다시 빌드하고, 의존성 그래프에 따라 `shared → server/client` 순서로 자동 실행.

## 셋업

```bash
# 의존성 설치 (루트에서) — pnpm 10 권장 (Corepack 활성화 시 자동)
corepack enable
pnpm install

# 서버 환경변수 파일 생성
cp apps/server/.dev.vars.example apps/server/.dev.vars
# → SESSION_SECRET 등 로컬 값 수정

# 클라이언트 환경변수 (VITE_API_BASE_URL=http://localhost:8787)
# apps/client/.env 생성
```

## D1 데이터베이스 (최초 1회)

```bash
cd apps/server
pnpm exec wrangler d1 create studyops-db
# → 출력된 database_id를 wrangler.jsonc에 반영

pnpm db:generate                                  # 마이그레이션 SQL 생성
pnpm exec wrangler d1 migrations apply studyops-db --local    # 로컬 D1 적용
pnpm exec wrangler d1 migrations apply studyops-db --remote   # 프로덕션 D1 적용
```

## 개발

```bash
pnpm dev:server    # wrangler dev (포트 8787, 로컬 D1)
pnpm dev:client    # Vite dev (포트 5173)
# 또는 동시에: pnpm dev
```

## 빌드 / 타입체크 / 테스트 (Turbo)

```bash
pnpm typecheck     # 전체 워크스페이스 typecheck (캐싱됨, 병렬)
pnpm build         # 전체 워크스페이스 빌드 (shared → server/client 자동 순서)
pnpm test          # 워크스페이스별 테스트 (현재 apps/server만)

# 특정 워크스페이스만
pnpm turbo build --filter=studyops-client
pnpm turbo typecheck --filter=@studyops/shared

# 캐시 무시하고 강제 재실행
pnpm turbo build --force

# 의존성 트리 시각화
pnpm turbo build --graph=graph.html
```

Turbo는 `.turbo/cache/`에 작업 결과를 캐싱합니다. 같은 입력(소스 + 설정 파일)이면 재실행하지 않고 캐시를 복원.

## 배포

```bash
# 서버 secrets (최초 1회)
cd apps/server
pnpm exec wrangler secret put SESSION_SECRET
pnpm exec wrangler secret put TOSS_AUTH_MODE    # live 설정 시

pnpm deploy                          # = wrangler deploy (dev)
pnpm deploy:production               # = wrangler deploy --env production

# 클라이언트 (앱인토스)
pnpm deploy:client:dev               # = ait build && ait deploy --profile dev
pnpm deploy:client:prod              # = ait build && ait deploy --profile prod
```

## 루트 스크립트

| 스크립트 | 설명 |
|---|---|
| `pnpm dev` | 서버 + 클라이언트 동시 dev (turbo --parallel) |
| `pnpm dev:server` / `pnpm dev:client` | 개별 dev 서버 |
| `pnpm build` | 전체 빌드 (Turbo가 shared → server/client 순서 자동 처리) |
| `pnpm typecheck` | 전체 typecheck (병렬, 캐싱됨) |
| `pnpm test` | 워크스페이스 테스트 (현재 apps/server) |
| `pnpm db:generate` | Drizzle 마이그레이션 SQL 생성 |
| `pnpm db:apply:dev` | 로컬 D1 dev에 마이그레이션 적용 |
| `pnpm db:apply:prod` | 프로덕션 D1에 마이그레이션 적용 (CI 권장) |
| `pnpm deploy:client:dev/prod` | 클라이언트 ait 빌드 + 배포 |

## 왜 Turborepo인가

- **스크립트 오케스트레이션**: `shared` 빌드 후에만 `server`/`client` 빌드되도록 자동 보장. 루트 package.json의 수동 `&&` 체인 불필요.
- **캐싱**: 같은 코드를 다시 빌드/테스트하지 않음. 로컬 `.turbo/cache/` + (선택) Remote Cache로 팀/CI 간 캐시 공유.
- **필터링**: `--filter=studyops-client`로 특정 워크스페이스와 그 의존성만 실행.
- **병렬 실행**: 독립적인 작업(typecheck 등)은 워크스페이스 간 병렬로.

## Remote Cache 설정 (선택 — Vercel)

로컬 캐시(`.turbo/cache/`)만으로도 충분하지만, **Remote Cache**를 켜면 팀원/CI 간 빌드 결과를 공유할 수 있습니다. 한 번 빌드한 작업을 다른 머신에서도 캐시 hit. CI 시간 절감 효과가 큼.

### 1. Vercel 계정 연결 (로컬에서 1회)

```bash
pnpm dlx turbo login       # 브라우저가 열리고 Vercel 인증
pnpm dlx turbo link        # 이 저장소를 Vercel 팀에 연결 (자동 감지)
```

이후 `pnpm turbo build` 등을 실행하면 자동으로 Remote Cache에 업로드/다운로드됨. 설정 파일은 `~/.turbo/auth.json` (git 추적 안 됨).

### 2. CI용 토큰 발급

GitHub Actions에서 Remote Cache를 쓰려면 별도 토큰 필요:

1. https://vercel.com/turborepo/docs/ci/github-actions 접속
2. Vercel 대시보드 → Settings → Tokens → "Create Token"
3. 발급된 토큰을 GitHub Secret으로 등록:
   - **`TURBO_TOKEN`**: 발급받은 토큰
   - **`TURBO_TEAM`**: Vercel 팀 slug (URL에서 확인, 예: `my-team`)

### 3. CI 동작 확인

GitHub Secrets에 두 값을 넣으면 모든 CI 워크플로우(`ci.yml`, `deploy.yml`, `deploy-dev.yml`)에서 자동으로 Remote Cache가 활성화됩니다. 값이 없으면 로컬 캐시만 사용 — 에러 없이 동작.

```bash
# 캐시 hit 확인 (처음엔 FULL TURBO 아님, 두 번째부터)
pnpm turbo build
# >>> Cache hit, replaying output
```

### 비용

Vercel 무료 티어: Remote Cache 월 100GB 대역폭. 소규모 팀/CI면 충분. 초과 시 유료 플랜 또는 자체 호스팅(S3/R2 + `TURBO_API` 커스텀 엔드포인트)으로 전환 가능.

## 환경변수

### 서버 (`apps/server/.dev.vars` / wrangler secrets)

| 변수 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `TOSS_AUTH_MODE` | O | `dev` | 인증 모드. `dev`(Toss API 스킵, 인가코드 `dev-<userKey>` 파싱) \| `live`(실제 OAuth2) |
| `TOSS_API_BASE_URL` | O | `https://apps-in-toss-api.toss.im` | Toss 파트너 API 베이스 (live 모드에서만 사용) |
| `SESSION_SECRET` | O | — | 세션 JWT 서명 비밀키 (HS256). 프로덕션은 `wrangler secret put`으로 등록 |
| `DISCORD_WEBHOOK_DEFAULT` | X | — | 기본 Discord webhook URL (개별 스터디 webhook이 없을 때 폴백) |

### 클라이언트 (`apps/client/.env`)

| 변수 | 설명 |
|---|---|
| `VITE_API_BASE_URL` | API 서버 베이스 URL. 로컬: `http://localhost:8787` |

## 문서

- [PRD](docs/PRD-StudyOps-Bot.md)
- [아키텍처](docs/ARCHITECTURE.md)
