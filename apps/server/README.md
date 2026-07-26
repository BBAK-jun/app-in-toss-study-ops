# StudyOps Server

Hono on Cloudflare Workers + D1 (Drizzle ORM). StudyOps Bot MVP 의 API 서버.

## 구조

```
apps/server/
├── src/
│   ├── index.ts            # Hono app 엔트리, 라우트 마운트, 미들웨어
│   ├── env.ts              # Bindings + AppEnv 타입
│   ├── middleware/         # auth(Bearer 검증), error(통일 포맷)
│   ├── lib/                # http-error, session(JWT), http(fetch 래퍼)
│   ├── auth/               # toss.ts(dev/live 분기), routes.ts(/auth/*)
│   ├── routes/             # studies.ts, rounds.ts, health.ts
│   ├── db/                 # schema.ts(Drizzle), client.ts, migrations/
│   └── discord/            # webhook.ts
├── wrangler.toml           # D1 binding, vars
├── .dev.vars.example       # 로컬 secrets 템플릿
└── drizzle.config.ts       # drizzle-kit 설정
```

## 셋업

```bash
# 루트에서 의존성 설치
npm install

# 서버 로컬 환경변수
cp apps/server/.dev.vars.example apps/server/.dev.vars
# → SESSION_SECRET 등 수정
```

## D1 데이터베이스 (최초 1회)

```bash
cd apps/server
npx wrangler d1 create studyops-db
# → 출력된 database_id 를 wrangler.toml 의 database_id 에 반영

# 마이그레이션 SQL (이미 src/db/migrations/0000_initial.sql 작성됨).
# 스키마 변경 시: npx drizzle-kit generate
npx wrangler d1 migrations apply studyops-db --local
```

## 개발

```bash
npm run dev -w apps/server     # wrangler dev (포트 8787)
```

## 엔드포인트 (요약)

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| GET | /health | ❌ | 헬스체크 |
| POST | /auth/login | ❌ | 인가코드 → 세션 토큰 |
| GET | /auth/me | ✅ | 현재 사용자 |
| POST | /auth/logout | ✅ | 로그아웃 (204) |
| POST/GET | /studies, /studies/:id | ✅ | 스터디 CRUD |
| PATCH | /studies/:id | ✅ | 스터디 수정(webhook 등) |
| POST/GET/DELETE | /studies/:id/participants[/:pid] | ✅ | 참여자 관리 |
| POST/GET | /studies/:id/rounds | ✅ | 회차 관리 |
| GET | /rounds/:id | ✅ | 회차 상세 |
| POST/GET | /rounds/:id/submissions | ✅ | 제출 관리 |
| GET | /rounds/:id/status | ✅ | 제출 현황 (핵심) |
| POST | /rounds/:id/reminder-message | ✅ | 리마인드 문구 생성 |
| POST | /rounds/:id/share-discord | ✅ | Discord webhook 발송 |

## dev 모드 인증

`TOSS_AUTH_MODE=dev` 시 Toss API 호출 스킵. 인가코드 형식 `dev-<userKey>` (예: `dev-1001`)를 파싱해 userKey 확정. 폴백 userKey=1.

## 타입체크 / 빌드

```bash
npm run build -w apps/server    # tsc --noEmit
```
