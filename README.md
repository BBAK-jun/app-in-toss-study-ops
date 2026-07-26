# StudyOps Bot

스터디 운영 자동화 봇 — Toss 앱인토스 WebView에서 동작하는 모바일 웹앱 + Cloudflare Workers 기반 API 서버.
스터디/회차/참여자를 관리하고, 회차별 제출 현황(제출률)을 추적하며, Discord Webhook으로 리마인드를 발송합니다.

인증은 Toss OAuth2(`appLogin`)를 사용하고, 데이터는 Cloudflare D1(SQLite)에 저장됩니다.

## 구조

```
studyops-bot/
├── package.json              # pnpm workspaces 루트
├── pnpm-workspace.yaml       # 워크스페이스 매니페스트 (pnpm)
├── tsconfig.base.json        # 공유 TS 설정 + @studyops/shared 경로 별칭
├── docs/                     # PRD, 아키텍처 문서
├── packages/
│   └── shared/               # 서버/클라이언트 공용 타입 (DTO, 엔티티, 에러)
└── apps/
    ├── server/               # Hono on Cloudflare Workers + D1 (Drizzle ORM)
    └── client/               # Vite + React + TDS Mobile (앱인토스 WebView)
```

## 셋업

```bash
# 의존성 설치 (루트에서)
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
npx wrangler d1 create studyops-db
# → 출력된 database_id를 wrangler.toml에 반영

npx drizzle-kit generate                          # 마이그레이션 SQL 생성
npx wrangler d1 migrations apply studyops-db --local    # 로컬 D1 적용
npx wrangler d1 migrations apply studyops-db --remote   # 프로덕션 D1 적용
```

## 개발

```bash
pnpm dev:server    # wrangler dev (포트 8787, 로컬 D1)
pnpm dev:client    # Vite dev (포트 5173)
```

## 빌드 / 타입체크

```bash
pnpm typecheck     # shared + server + client 각각 tsc --noEmit (병렬)
pnpm build         # shared + server + client 빌드
```

## 배포

```bash
# 서버 secrets (최초 1회)
cd apps/server
npx wrangler secret put SESSION_SECRET
npx wrangler secret put TOSS_AUTH_MODE    # live 설정 시

npx wrangler deploy                        # 서버 배포

# 클라이언트
pnpm build:client                          # Vite 빌드 → dist/ (앱인토스 업로드)
```

## 루트 스크립트

| 스크립트 | 설명 |
|---|---|
| `pnpm dev:client` | 클라이언트 개발 서버 (Vite, 포트 5173) |
| `pnpm dev:server` | 서버 개발 서버 (wrangler dev, 포트 8787) |
| `pnpm build` | 전체 워크스페이스 빌드 |
| `pnpm typecheck` | 전체 타입체크 (shared/server/client 각 `tsc --noEmit`) |
| `pnpm db:generate` | Drizzle 마이그레이션 SQL 생성 |
| `pnpm db:apply:dev` | 로컬 D1에 마이그레이션 적용 |
| `pnpm db:apply:prod` | 프로덕션 D1에 마이그레이션 적용 |

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
