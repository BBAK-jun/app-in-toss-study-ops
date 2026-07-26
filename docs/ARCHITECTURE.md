# StudyOps Bot MVP — 아키텍처 문서

> 구현 에이전트가 이 문서만으로 구현을 완료할 수 있도록 작성된 상세 설계서.
> PRD: `docs/PRD-StudyOps-Bot.md` 와 함께 읽을 것.

작성일: 2026.07.12 KST

---

## 0. 설계 원칙 (빠른 결정을 위한 가이드)

1. **단순성 > 유연성**: MVP 8개 기능만. 과잉 추상화·과잉 설정 금지.
2. **Toss 식별자 = 진실**: `userKey`(number)가 사용자 PK. 자체 ID 체계 만들지 않는다.
3. **dev/live 분기**: 인증만 `TOSS_AUTH_MODE`로 분기. 비즈니스 로직은 분기 없음.
4. **타입 공유**: 서버·클라이언트가 `packages/shared`의 동일 DTO 타입 사용.
5. **복붙 가능**: 이 문서의 코드 블록은 그대로 파일에 넣으면 동작해야 한다.

---

## 4-1. 모노레포 디렉토리 구조

```
app-intoss-study-workspace/
├── package.json                    # npm workspaces 정의, 루트 스크립트
├── tsconfig.base.json              # 공유 TS 설정 (target, strict, paths)
├── .gitignore                      # node_modules, .dev.vars, .wrangler, dist 등
├── README.md                       # 셋업/개발/배포 가이드
├── docs/
│   ├── PRD-StudyOps-Bot.md
│   └── ARCHITECTURE.md             # 이 파일
│
├── packages/
│   └── shared/                     # 서버/클라이언트 공용 타입 패키지
│       ├── package.json            # name: @studyops/shared, 의존성 없음
│       ├── tsconfig.json           # extends 루트, "composite": true
│       ├── src/
│       │   ├── index.ts            # re-export
│       │   ├── entities.ts         # User, Study, Round, Participant, Submission
│       │   ├── auth.ts             # LoginRequest, LoginResponse, SessionUser
│       │   ├── studies.ts          # StudyCreateInput, StudyDto 등
│       │   ├── rounds.ts           # RoundCreateInput, RoundDto, RoundStatusDto
│       │   ├── participants.ts     # ParticipantCreateInput, ParticipantDto
│       │   ├── submissions.ts      # SubmissionCreateInput, SubmissionDto
│       │   └── errors.ts           # ApiErrorCode, ApiErrorResponse
│       └── README.md
│
├── apps/
│   ├── server/                     # Hono on Cloudflare Workers
│   │   ├── package.json            # hono, drizzle-orm, @cloudflare/workers-types
│   │   ├── tsconfig.json           # extends 루트, workers lib
│   │   ├── wrangler.jsonc          # D1 binding, vars, env.production (ADR-006)
│   │   ├── .dev.vars.example       # TOSS_AUTH_MODE, SESSION_SECRET 등
│   │   ├── drizzle.config.ts       # D1 dialect, schema path, migrations out
│   │   ├── boot-check.ts           # 부트 타임 fail-fast 검증 (ADR-006)
│   │   ├── src/
│   │   │   ├── index.ts            # Hono app 엔트리, 미들웨어 체인 + /mcp 분기 (ADR-010)
│   │   │   ├── env.ts              # AppEnv = { Bindings: Env & SecretBindings, Variables: { user, requestId } }
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts         # Bearer 세션 토큰 검증 → c.set('user', ...)
│   │   │   │   ├── error.ts        # formatHttpError 위임 (lib/http-error.ts)
│   │   │   │   ├── request-id.ts   # cf-ray || randomUUID → X-Request-Id 헤더
│   │   │   │   └── cors.ts         # ENVIRONMENT 기반 origin 화이트리스트 (ADR-011)
│   │   │   ├── lib/
│   │   │   │   ├── session.ts      # JWT(HS256) 발급/검증 (Web Crypto API)
│   │   │   │   └── http-error.ts   # HttpError 클래스 + formatHttpError 헬퍼
│   │   │   ├── auth/
│   │   │   │   ├── toss.ts         # Toss generate-token, refresh, login-me, remove
│   │   │   │   └── routes.ts       # /auth/login, /auth/me, /auth/logout
│   │   │   ├── routes/
│   │   │   │   ├── studies.ts      # /studies CRUD + /participants, /rounds 서브
│   │   │   │   ├── rounds.ts       # /rounds/:id/submissions, /status, /reminder-message, /share-discord
│   │   │   │   └── health.ts       # GET /health
│   │   │   ├── db/
│   │   │   │   ├── schema.ts       # Drizzle 스키마 (아래 4-2)
│   │   │   │   ├── client.ts       # drizzle(env.DB) 인스턴스 팩토리
│   │   │   │   └── migrations/     # wrangler d1 migrations 생성 결과 (.sql)
│   │   │   └── discord/
│   │   │       └── webhook.ts      # Discord webhook POST (현황/리마인드 메시지)
│   │   └── README.md
│   │
│   └── client/                     # Vite + React + TDS Mobile
│       ├── package.json            # react, react-router-dom, @toss/tds-mobile, ...
│       ├── tsconfig.json
│       ├── tsconfig.node.json      # vite.config용
│       ├── vite.config.ts
│       ├── granite.config.ts       # @apps-in-toss/web-framework/config defineConfig
│       ├── .env                    # VITE_API_BASE_URL
│       ├── index.html
│       └── src/
│           ├── main.tsx            # ReactDOM + Provider + Router 마운트
│           ├── App.tsx             # 라우트 선언
│           ├── api/
│           │   ├── client.ts       # fetch 래퍼, Bearer 토큰 주입, 에러 정규화
│           │   ├── auth.ts         # login, getMe, logout
│           │   ├── studies.ts      # createStudy, listStudies, getStudy, ...
│           │   ├── rounds.ts       # createRound, listRounds, getRoundStatus, ...
│           │   └── submissions.ts
│           ├── context/
│           │   └── SessionContext.tsx  # 세션 토큰(memory + sessionStorage) 관리
│           ├── hooks/
│           │   └── useSession.ts
│           ├── components/
│           │   ├── AppShell.tsx    # Top 헤더 + 하단 네비
│           │   ├── ErrorBoundary.tsx
│           │   ├── EmptyState.tsx
│           │   └── RateBadge.tsx   # 제출률 Badge
│           └── pages/
│               ├── LoginPage.tsx
│               ├── StudiesPage.tsx           # 스터디 목록
│               ├── StudyDetailPage.tsx        # 회차 목록 + 참여자 탭
│               ├── RoundDetailPage.tsx        # 제출 현황 (제출자/미제출자)
│               ├── SubmissionCreatePage.tsx   # 제출 링크 등록
│               ├── ReminderPage.tsx           # 리마인드 문구 + 복사 + Discord 발송
│               └── NotFoundPage.tsx
```

**각 파일 역할 한 줄 요약**은 위 트리의 인라인 주석과 동일. 새 파일 추가 시 반드시 역할 주석을 인라인으로 달 것.

---

## 4-2. D1 데이터베이스 스키마 (Drizzle ORM)

파일: `apps/server/src/db/schema.ts`

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// 타임스탬프 관례: 모든 createdAt은 epoch milliseconds (integer). D1은 datetime도 가능하지만
// 정렬/계산 편의를 위해 ms 정수로 통일. 클라이언트는 new Date(createdAt) 로 변환.
// ID 관례: Toss userKey만 number PK. 나머지 엔티티는 uuid(text, crypto.randomUUID()).

// ─── users ────────────────────────────────────────────────────────────────
// userKey: Toss login-me에서 받는 앱 단위 식별자. 동일 사용자도 앱마다 다름.
//          횟수 제한 없이 login-me 호출 가능 → 매 로그인마다 upsert.
export const users = sqliteTable('users', {
  userKey: integer('user_key').primaryKey(),              // number, PK
  displayName: text('display_name').notNull(),            // 운영자가 노출에 사용 (login-me name이 암호화됨 → 첫 로그인 시 입력 또는 기본값)
  createdAt: integer('created_at').notNull(),
});

// ─── studies ──────────────────────────────────────────────────────────────
export const studies = sqliteTable('studies', {
  id: text('id').primaryKey(),                            // uuid
  ownerId: integer('owner_id').notNull().references(() => users.userKey, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  description: text('description'),
  discordWebhookUrl: text('discord_webhook_url'),         // nullable, PATCH로 설정
  createdAt: integer('created_at').notNull(),
});

// ─── rounds ───────────────────────────────────────────────────────────────
export const rounds = sqliteTable('rounds', {
  id: text('id').primaryKey(),                            // uuid
  studyId: text('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
  roundNumber: integer('round_number').notNull(),         // 1, 2, 3...
  title: text('title').notNull(),
  dueAt: integer('due_at'),                               // nullable, ms
  createdAt: integer('created_at').notNull(),
});

// ─── participants ─────────────────────────────────────────────────────────
// 스터디 멤버. 회차별이 아님 (스터디 단위 등록). 회차 현황은 이 목록 기준.
export const participants = sqliteTable('participants', {
  id: text('id').primaryKey(),                            // uuid
  studyId: text('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  discordHandle: text('discord_handle'),                  // nullable, 예: @sondi 또는 username (멘션용)
  createdAt: integer('created_at').notNull(),
});

// ─── submissions ──────────────────────────────────────────────────────────
// 참여자가 회차에 제출한 링크 1개. UNIQUE(roundId, participantId) = 회차당 1명 1제출.
export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(),                            // uuid
  roundId: text('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),                             // 글/PR/Issue/Notion URL
  note: text('note'),                                     // nullable 메모
  createdAt: integer('created_at').notNull(),
}, (t) => ({
  // Drizzle 최신 API: 두 번째 인수는 컬럼 또는 제약 객체 반환 함수.
  uniqRoundParticipant: uniqueIndex('uniq_round_participant').on(t.roundId, t.participantId),
}));

// 인덱스: 외래키 검색 성능 (D1은 자동 인덱스 미지원)
// 마이그레이션 생성 시 아래 인덱스도 스키마에 포함시킬 것 (drizzle-kit이 자동 반영).
```

**인덱스 요약:**
- `submissions`: `uniq_round_participant` UNIQUE(roundId, participantId) — 동일 회차 중복 제출 방지 + 현황 조회 성능.
- `rounds.studyId`, `participants.studyId`, `submissions.roundId` — Drizzle의 references 선언만으로는 D1에 자동 인덱스가 안 생기므로, 조회 빈도가 높은 FK는 명시적 `index()` 추가 권장. (위 예시는 핵심 UNIQUE만 표기; 구현 시 필요 index 추가.)

**타임스탬프 관례:** 모든 `createdAt`, `dueAt`은 **epoch milliseconds (integer)**. `Date.now()` 사용. 클라이언트에서 `new Date(ms)` 로 변환.

**마이그레이션 생성 명령 (4-8 참조):**
```bash
cd apps/server
npx drizzle-kit generate   # src/db/migrations/*.sql 생성
npx wrangler d1 migrations apply studyops-db --local    # 로컬 D1 적용
npx wrangler d1 migrations apply studyops-db --remote   # 프로덕션 D1 적용
```

---

## 4-3. REST API 컨트랙트

**베이스:** Cloudflare Worker 배포 후 `https://<worker>.workers.dev` (또는 커스텀 도메인). 클라이언트는 `VITE_API_BASE_URL`로 참조.

**인증:** `Authorization: Bearer <sessionToken>` 헤더. `/auth/login`, `/health`, `/ready` 제외 모든 엔드포인트에 미들웨어 적용. `/mcp`는 별도 Bearer token(`MCP_API_TOKEN`) 검증 (ADR-010).

**에러 응답 포맷 (통일):**
```typescript
// packages/shared/src/errors.ts
export type ApiErrorCode =
  | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'VALIDATION_ERROR' | 'CONFLICT'
  | 'TOSS_AUTH_FAILED' | 'DISCORD_WEBHOOK_FAILED'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  error: { code: ApiErrorCode; message: string };
}
```
HTTP 상태 코드 매핑: 401 (UNAUTHORIZED), 403 (FORBIDDEN), 404 (NOT_FOUND), 400 (VALIDATION_ERROR), 409 (CONFLICT), 502 (TOSS_AUTH_FAILED / DISCORD_WEBHOOK_FAILED), 500 (INTERNAL_ERROR).

**Hono 라우트 그룹 구조 (`src/index.ts`):**
```typescript
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { authRoutes } from './auth/routes';
import { studyRoutes } from './routes/studies';
import { roundRoutes } from './routes/rounds';
import { healthRoutes } from './routes/health';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { requestIdMiddleware } from './middleware/request-id';
import { corsMiddleware } from './middleware/cors';
import type { AppEnv } from './env';

const app = new Hono<AppEnv>();

// 미들웨어 파이프라인 (순서 중요):
//   requestId → cors → errorHandler → routes
app.use('*', logger());
app.use('*', requestIdMiddleware);   // X-Request-Id 헤더 (cf-ray || randomUUID)
app.use('*', corsMiddleware);         // ENVIRONMENT 기반 origin 화이트리스트 (ADR-011)
app.onError(errorHandler);            // formatHttpError 위임

app.route('/', healthRoutes);         // /health, /ready
app.route('/auth', authRoutes);

// 인증 필요 라우트 그룹
const protectedApi = new Hono<AppEnv>();
protectedApi.use('*', authMiddleware);
protectedApi.route('/studies', studyRoutes);
protectedApi.route('/rounds', roundRoutes);

app.route('/', protectedApi);

// /mcp 분기 — Hono 체인 밖. MCP_API_TOKEN 검증 후 StudyOpsMcpAgent DO로 라우팅 (ADR-010).
export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/mcp')) {
      // ... Bearer token 검증 후 McpAgent.fetch() 위임
    }
    return app.fetch(request, env, ctx);
  },
};
```

> 미들웨어 상세는 [ADR-011](wiki/src/content/decisions/adr-011-cors-origin-policy.md) 참조. `formatHttpError`는 `errorHandler`(Hono onError)와 `/mcp` 401 직접 응답이 공유 → 두 경로의 JSON 포맷/로그 일관.

### 엔드포인트 전체 목록

#### 인증 (`/auth`) — `authRoutes`
| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| POST | `/auth/login` | ❌ | 인가코드 → 세션 토큰 발급 |
| GET | `/auth/me` | ✅ | 현재 사용자 |
| POST | `/auth/logout` | ✅ | 세션 무효화 (클라이언트 토큰 폐기; MVP는 stateless JWT라 블랙리스트 생략) |

**POST /auth/login**
```typescript
// Request
interface LoginRequest {
  authorizationCode: string;       // appLogin()에서 받은 1회성 코드 (유효 10분)
  referrer: 'DEFAULT' | 'SANDBOX'; // appLogin() 결과 그대로
}
// Response 200
interface LoginResponse {
  sessionToken: string;            // 자체 HS256 JWT
  user: SessionUser;               // { userKey, displayName }
}
```

**GET /auth/me** → `{ userKey, displayName }`

**POST /auth/logout** → `204 No Content`

#### 스터디 (`/studies`) — `studyRoutes`
| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/studies` | 스터디 생성 |
| GET | `/studies` | 내(ownerId=나) 스터디 목록 |
| GET | `/studies/:id` | 스터디 상세 |
| PATCH | `/studies/:id` | 스터디 수정 (webhook URL 설정 등) |
| POST | `/studies/:id/participants` | 참여자 추가 |
| GET | `/studies/:id/participants` | 참여자 목록 |
| DELETE | `/studies/:id/participants/:pid` | 참여자 삭제 |
| POST | `/studies/:id/rounds` | 회차 생성 |
| GET | `/studies/:id/rounds` | 회차 목록 |

**POST /studies**
```typescript
interface StudyCreateInput { title: string; description?: string; }
interface StudyDto { id: string; ownerId: number; title: string; description: string | null;
  discordWebhookUrl: string | null; createdAt: number; }
```

**PATCH /studies/:id** — 부분 업데이트. `{ title?, description?, discordWebhookUrl? }`. `discordWebhookUrl`에 null 허용(삭제). 응답: 업데이트된 `StudyDto`.

**권한:** `ownerId === c.get('user').userKey` 검증. 아닐 시 403 FORBIDDEN.

**POST /studies/:id/participants**
```typescript
interface ParticipantCreateInput { name: string; discordHandle?: string; }
interface ParticipantDto { id: string; studyId: string; name: string; discordHandle: string | null; createdAt: number; }
```
복수 등록 지원 권장: `{ participants: ParticipantCreateInput[] }` 배열도 허용.

**POST /studies/:id/rounds**
```typescript
interface RoundCreateInput { roundNumber: number; title: string; dueAt?: number; }
interface RoundDto { id: string; studyId: string; roundNumber: number; title: string; dueAt: number | null; createdAt: number; }
```

#### 회차 (`/rounds`) — `roundRoutes`
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/rounds/:id` | 회차 상세 |
| POST | `/rounds/:id/submissions` | 제출 링크 등록 |
| GET | `/rounds/:id/submissions` | 제출 목록 |
| GET | `/rounds/:id/status` | 제출 현황 (제출자/미제출자/제출률) |
| POST | `/rounds/:id/reminder-message` | 리마인드 문구 생성 |
| POST | `/rounds/:id/share-discord` | Discord webhook 발송 |

**POST /rounds/:id/submissions**
```typescript
interface SubmissionCreateInput { participantId: string; url: string; note?: string; }
interface SubmissionDto { id: string; roundId: string; participantId: string; url: string;
  note: string | null; createdAt: number; }
```
UNIQUE 제약 위반 시 409 CONFLICT ("이미 제출했습니다").

**GET /rounds/:id/status** — MVP 핵심 엔드포인트.
```typescript
interface RoundStatusDto {
  roundId: string;
  roundNumber: number;
  title: string;
  dueAt: number | null;
  total: number;                              // study 참여자 총원
  submitted: SubmittedEntry[];                // 제출자 (참여자 + URL)
  notSubmitted: ParticipantDto[];             // 미제출자
  rate: number;                               // 0~1 (submitted.length / total)
}
interface SubmittedEntry { participant: ParticipantDto; submission: SubmissionDto; }
```

**POST /rounds/:id/reminder-message**
```typescript
// Request (옵션)
interface ReminderOptions { tone?: 'friendly' | 'formal'; }
// Response
interface ReminderMessageResponse { message: string; }
```
서버가 미제출자 목록 + 회차 정보로 문구 자동 생성. 예시 포맷:
```
📚 [N회차] 제출 리마인드
제출률: 3/5 (60%)
마감: 2026-07-15 23:59

아직 제출하지 않은 분:
- @hyunwoo
- @jiae

지금 바로 제출해주세요! 제출 링크는 스레드에서 확인하세요.
```

**POST /rounds/:id/share-discord**
```typescript
// Request (선택)
interface ShareDiscordRequest { webhookUrl?: string; message?: string; }
// webhookUrl 미제공 시 study.discordWebhookUrl 사용. 둘 다 없으면 400.
// message 미제공 시 현황 요약 자동 생성.
// Response
interface ShareDiscordResponse { ok: true; discordResponse?: unknown; }
```

---

## 4-4. 인증 플로우 시퀀스

```
┌─────────┐   ┌─────────┐   ┌─────────────┐   ┌──────────────┐
│ Client  │   │ Server  │   │ Toss API    │   │ D1 (users)   │
│(appLogin)│   │(Hono)   │   │             │   │              │
└────┬────┘   └────┬────┘   └──────┬──────┘   └──────┬───────┘
     │             │               │                 │
     │ 1. appLogin() (SDK)         │                 │
     │ → { authorizationCode,      │                 │
     │     referrer }              │                 │
     │             │               │                 │
     │ 2. POST /auth/login         │                 │
     │   { authorizationCode,      │                 │
     │     referrer }              │                 │
     │────────────►│               │                 │
     │             │               │                 │
     │             │ [dev 모드 분기]                │
     │             │ TOSS_AUTH_MODE === 'dev' ?      │
     │             │               │                 │
     │             │ ┌─── dev ───┐ │                 │
     │             │ │ userKey =  │ │                 │
     │             │ │ 고정값 또는│ │                 │
     │             │ │ 코드에서  │ │                 │
     │             │ │ 파싱      │ │                 │
     │             │ │ (Toss 스킵)│                 │
     │             │ └───────────┘ │                 │
     │             │               │                 │
     │             │ ┌── live ──┐ │                 │
     │             │ │ 3a. POST │ │                 │
     │             │ │ generate-token                │
     │             │ │────────────────────────────►│ (mTLS 프로덕션)
     │             │ │ ◄──── { accessToken, ... }  │
     │             │ │          │ │                 │
     │             │ │ 3b. GET  │ │                 │
     │             │ │ login-me │ │                 │
     │             │ │ (Bearer) │ │                 │
     │             │ │────────────────────────────►│
     │             │ │ ◄──── { userKey, ... }      │
     │             │ └──────────┘ │                 │
     │             │               │                 │
     │             │ 4. upsert users (userKey) ─────────────►│
     │             │ ◄───── ok ─────────────────────────────│
     │             │               │                 │
     │             │ 5. JWT(HS256) 발급              │
     │             │    payload: { userKey, iat, exp }       │
     │             │    secret: SESSION_SECRET (env)         │
     │             │               │                 │
     │ ◄───────────│ { sessionToken, user }          │
     │             │               │                 │
     │ 6. 저장:    │               │                 │
     │   - sessionToken → sessionStorage (앱 생명주기)
     │   - user → 메모리(React Context)
     │   - 민감정보 장기 저장 금지 (토스 정책)     │
     │             │               │                 │
     │ 7. 이후 요청: Authorization: Bearer <sessionToken>
     │────────────►│               │                 │
     │             │ 미들웨어 검증 (Web Crypto JWT)  │
```

### dev 모드 폴백 상세 (`apps/server/src/auth/toss.ts`)

```typescript
import type { AppEnv } from '../env';

export interface TossUserInfo { userKey: number; name?: string; }

export async function resolveTossUser(
  env: AppEnv['Bindings'],
  authorizationCode: string,
  referrer: 'DEFAULT' | 'SANDBOX',
): Promise<TossUserInfo> {
  if (env.TOSS_AUTH_MODE === 'dev') {
    // dev: Toss API 호출 스킵. 인가코드를 userKey로 파싱하거나 고정값 사용.
    // 로컬 개발용. 인가코드 형식 "dev-<userKey>" 를 허용 (예: "dev-1001").
    const match = /^dev-(\d+)$/.exec(authorizationCode);
    const userKey = match ? Number(match[1]) : 1; // 폴백 기본 userKey=1
    return { userKey, name: '개발자' };
  }

  // live: 실제 Toss OAuth2 플로우
  // 1. 인가코드 → accessToken 교환
  const tokenRes = await fetch(`${env.TOSS_API_BASE_URL}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorizationCode, referrer }),
    // 프로덕션: mTLS 인증서 필요 (env에 cert/key 바인딩)
  });
  if (!tokenRes.ok) {
    throw new HttpError(502, 'TOSS_AUTH_FAILED', `generate-token failed: ${tokenRes.status}`);
  }
  const { accessToken } = await tokenRes.json() as { accessToken: string };

  // 2. accessToken → login-me
  const meRes = await fetch(`${env.TOSS_API_BASE_URL}/api-partner/v1/apps-in-toss/user/oauth2/login-me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!meRes.ok) {
    throw new HttpError(502, 'TOSS_AUTH_FAILED', `login-me failed: ${meRes.status}`);
  }
  const me = await meRes.json() as { userKey: number; name?: string };
  return { userKey: me.userKey, name: me.name };
}
```

### 세션 JWT 발급/검증 (`apps/server/src/lib/session.ts`)

```typescript
import { jwtVerify, SignJWT } from 'hono/utils/jwt'; // Hono 내장 (Web Crypto 기반)

export async function issueSession(env: { SESSION_SECRET: string }, userKey: number): Promise<string> {
  return await new SignJWT({ userKey })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(env.SESSION_SECRET);
}

export async function verifySession(env: { SESSION_SECRET: string }, token: string): Promise<{ userKey: number } | null> {
  try {
    const payload = await jwtVerify(token, env.SESSION_SECRET);
    return { userKey: payload.userKey as number };
  } catch {
    return null;
  }
}
```

### 세션 토큰 저장 (클라이언트)

토스 앱 문서상 **민감정보는 서버 보관 원칙**, 클라이언트는 장기 저장 금지. 따라서:
- `sessionToken`: `sessionStorage` (앱 세션 생명주기). 앱 종료 시 자연 만료.
- `user`: React Context 메모리 전용. `sessionStorage`에 캐시하지 않음.
- `localStorage` 사용 금지.

---

## 4-5. 클라이언트 화면 구조 / 라우팅

### `granite.config.ts` (샘플)
```typescript
// apps/client/granite.config.ts
import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'studyops-bot',
  brand: {
    displayName: '스터디옵스',
    primaryColor: '#0064FF',    // 토스 블루 계열
    icon: './src/assets/icon.png',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'npm run dev',
      build: 'npm run build',
    },
  },
  permissions: [],               // MVP: 추가 권한 최소화
  outdir: 'dist',
});
```

### `src/main.tsx`
```tsx
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import { App } from './App';
import { SessionProvider } from './context/SessionContext';

const root = createRoot(document.getElementById('root')!);
root.render(
  createElement(TDSMobileAITProvider, null,
    createElement(SessionProvider, null,
      createElement(App),
    ),
  ),
);
```

> 주의: TDS Mobile AIT는 emotion을 쓰므로 `@emotion/react` peerDependency 필요. JSX transform은 React 17+ automatic (`tsconfig` `"jsx": "react-jsx"`). 따라서 위처럼 `createElement` 또는 `.jsx` 없이 일반 JSX 가능 — `main.tsx`는 Provider 중첩을 명시적으로 보이기 위해 createElement 사용.

### 라우팅 (`src/App.tsx`, React Router v6)
```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './hooks/useSession';
import { LoginPage } from './pages/LoginPage';
import { StudiesPage } from './pages/StudiesPage';
import { StudyDetailPage } from './pages/StudyDetailPage';
import { RoundDetailPage } from './pages/RoundDetailPage';
import { SubmissionCreatePage } from './pages/SubmissionCreatePage';
import { ReminderPage } from './pages/ReminderPage';
import { NotFoundPage } from './pages/NotFoundPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Protected><StudiesPage /></Protected>} />
      <Route path="/studies/:studyId" element={<Protected><StudyDetailPage /></Protected>} />
      <Route path="/rounds/:roundId" element={<Protected><RoundDetailPage /></Protected>} />
      <Route path="/rounds/:roundId/submit" element={<Protected><SubmissionCreatePage /></Protected>} />
      <Route path="/rounds/:roundId/reminder" element={<Protected><ReminderPage /></Protected>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
```

### 화면별 TDS 컴포넌트 매핑

| 화면 | 경로 | 주요 TDS 컴포넌트 | 데이터 |
|---|---|---|---|
| 로그인 | `/login` | `Top`, `Button` (CTA), `Paragraph` | `appLogin()` 호출 |
| 스터디 목록 | `/` | `Top`, `ListHeader`, `ListRow`, `BottomCTA`(스터디 생성), `Badge`(회차 수) | `GET /studies` |
| 스터디 상세 | `/studies/:id` | `Top`, `Tab`(회차/참여자), `ListRow`, `BottomCTA`(회차 생성), `Modal`(참여자 추가) | `GET /studies/:id`, `/rounds`, `/participants` |
| 회차 상세 | `/rounds/:id` | `Top`, `Badge`(제출률 %), `ListHeader`(제출자/미제출자), `ListRow`, `BottomCTA`(리마인드/공유), `Border`(구분) | `GET /rounds/:id/status` |
| 제출 등록 | `/rounds/:id/submit` | `Top`, `ListRow`(참여자 선택), `TextField`(URL), `BottomCTA` | `POST /rounds/:id/submissions` |
| 리마인드/공유 | `/rounds/:id/reminder` | `Top`, `Paragraph`(생성된 문구), `Button`(복사), `BottomCTA`(Discord 발송), `Toast`(복사 완료), `BottomSheet`(발송 확인) | `POST /reminder-message`, `POST /share-discord` |

### API 클라이언트 (`src/api/client.ts`)
```typescript
import type { ApiErrorResponse } from '@studyops/shared';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const TOKEN_KEY = 'studyops_session';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as ApiErrorResponse;
    throw new ApiError(body.error?.code ?? 'INTERNAL_ERROR', body.error?.message ?? res.statusText, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

---

## 4-6. Discord Webhook 통합 설계

파일: `apps/server/src/discord/webhook.ts`

```typescript
export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;            // 0xRRGGBB 정수
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
}

export interface DiscordWebhookPayload {
  content?: string;          // 일반 텍스트 (멘션 포함 가능)
  embeds?: DiscordEmbed[];
  username?: string;
}

export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload,
): Promise<{ ok: true; discordResponse: unknown }> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new HttpError(502, 'DISCORD_WEBHOOK_FAILED', `Discord webhook failed (${res.status}): ${text}`);
  }

  // Discord는 성공 시 204 No Content 또는 빈 응답
  const discordResponse = await res.text().then((t) => t || null);
  return { ok: true, discordResponse };
}

// 현황 메시지 생성 헬퍼
export function buildStatusPayload(opts: {
  roundNumber: number;
  roundTitle: string;
  rate: number;                    // 0~1
  submittedCount: number;
  total: number;
  notSubmittedHandles: string[];   // discordHandle 목록
  dueAt: number | null;
}): DiscordWebhookPayload {
  const pct = Math.round(opts.rate * 100);
  const due = opts.dueAt ? new Date(opts.dueAt).toLocaleString('ko-KR') : '미정';
  const mentions = opts.notSubmittedHandles
    .map((h) => (h.startsWith('@') ? h : `@${h}`))
    .join(' ');
  return {
    content: mentions ? `📚 제출 현황 공유\n${mentions}` : '📚 제출 현황 공유',
    embeds: [{
      title: `[${opts.roundNumber}회차] ${opts.roundTitle}`,
      description: `제출률 **${opts.submittedCount}/${opts.total} (${pct}%)**\n마감: ${due}`,
      color: pct >= 80 ? 0x22C55E : pct >= 50 ? 0xF59E0B : 0xEF4444,
      fields: opts.notSubmittedHandles.length
        ? [{ name: '미제출자', value: opts.notSubmittedHandles.map((h) => h.startsWith('@') ? h : `@${h}`).join(', ') || '없음', inline: false }]
        : [],
      footer: { text: 'StudyOps Bot' },
    }],
  };
}
```

> Discord webhook은 `@username` 형식 멘션은 사용자 이름이 유니크한 경우에만 동작. `<@userid>` 멘션이 확실하지만 MVP에서는 discordHandle을 username으로 간주하고 `@handle`로 시도. 추후 사용자 ID 매핑 기능은 나중으로 미룸.

`/rounds/:id/share-discord` 라우트는:
1. 회차 + 참여자 + 제출 현황 조회.
2. `buildStatusPayload()` 로 페이로드 생성.
3. `sendDiscordWebhook(study.discordWebhookUrl, payload)` 호출.
4. 결과 반환.

---

## 4-7. 환경변수 / 비밀키 매핑

### 서버 `apps/server/.dev.vars.example`
```bash
# 인증 모드: 'dev' (Toss API 스킵) | 'live' (실제 Toss OAuth2)
TOSS_AUTH_MODE=dev

# Toss API (live 모드에서만 사용)
TOSS_API_BASE_URL=https://apps-in-toss-api.toss.im

# 세션 JWT 서명 비밀키 (HS256). 로컬에서는 임의 문자열.
# 프로덕션: wrangler secret put SESSION_SECRET
SESSION_SECRET=change-me-to-a-long-random-string

# (옵션) 기본 Discord webhook — 개별 스터디에 webhook이 없을 때 폴백
DISCORD_WEBHOOK_DEFAULT=

# (live 프로덕션 전용) mTLS 인증서 — wrangler에 secret으로 바인딩
# TOSS_MTLS_CERT=...
# TOSS_MTLS_KEY=...
```

### 서버 `apps/server/wrangler.jsonc` (env.production 블록 포함, ADR-006)
```jsonc
{
  "name": "studyops-server",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-01",
  "compatibility_flags": ["nodejs_compat"],

  // 기본 환경 = dev
  "vars": {
    "ENVIRONMENT": "dev",
    "TOSS_AUTH_MODE": "dev",
    "TOSS_API_BASE_URL": "https://apps-in-toss-api.toss.im"
  },

  "d1_databases": [{
    "binding": "DB",
    "database_name": "studyops-db-dev",
    "database_id": "YOUR_DEV_D1_ID",
    "migrations_dir": "src/db/migrations"
  }],

  // prod는 별도 Worker 이름 + 별도 D1 인스턴스 (ADR-007)
  "env": {
    "production": {
      "name": "studyops-server-production",
      "vars": {
        "ENVIRONMENT": "production",
        "TOSS_AUTH_MODE": "live",
        "TOSS_API_BASE_URL": "https://apps-in-toss-api.toss.im",
        "ALLOWED_ORIGINS": "https://apps-in-toss.toss.im"   // CORS 화이트리스트 (ADR-011)
      },
      "d1_databases": [{
        "binding": "DB",
        "database_name": "studyops-db-prod",
        "database_id": "YOUR_PROD_D1_ID",
        "migrations_dir": "src/db/migrations"
      }]
    }
  }
}
// SESSION_SECRET, MCP_API_TOKEN, TOSS_MTLS_*는 wrangler secret put으로 등록 (.dev.vars는 로컬 only)
```

### 서버 `src/env.ts` (AppEnv — `wrangler types` 자동 생성 + SecretBindings intersect)
```typescript
// worker-configuration.d.ts (자동 생성) 의 Env + 수동 SecretBindings intersect.
interface SecretBindings {
  SESSION_SECRET: string;
  MCP_API_TOKEN: string;          // /mcp 인증 (ADR-010)
  TOSS_MTLS_CERT?: string;        // live 모드 전용
  TOSS_MTLS_KEY?: string;
  DISCORD_WEBHOOK_DEFAULT?: string;
}

export type AppEnv = {
  Bindings: Env & SecretBindings;     // D1Database, ENVIRONMENT, TOSS_AUTH_MODE, ...
  Variables: {
    user: { userKey: string };        // authMiddleware 가 세팅
    requestId: string;                // requestIdMiddleware 가 세팅
  };
};
```

### 클라이언트 `apps/client/.env`
```bash
VITE_API_BASE_URL=http://localhost:8787   # wrangler dev 기본 포트
```

---

## 4-8. 로컬 개발 & 배포 명령

### 최초 셋업
```bash
# 루트에서
npm install                    # 모든 워크스페이스 의존성 설치

# 서버 환경
cp apps/server/.dev.vars.example apps/server/.dev.vars
# → SESSION_SECRET 등 로컬 값으로 수정

# 클라이언트 환경
# apps/client/.env 생성 (VITE_API_BASE_URL)
```

### D1 데이터베이스 준비 (최초 1회)
```bash
cd apps/server
npx wrangler d1 create studyops-db-dev
npx wrangler d1 create studyops-db-prod --experimental-prepared-prod  # prod 전용 (ADR-007)
# → 출력된 database_id들을 wrangler.jsonc에 반영 (dev/prod 각각)

# 스키마에서 마이그레이션 SQL 생성
npx drizzle-kit generate

# 로컬 D1에 적용
npx wrangler d1 migrations apply studyops-db-dev --local

# 원격 dev/prod D1에 적용 (별도 커맨드, ADR-008 게이트)
npx wrangler d1 migrations apply studyops-db-dev --remote
npx wrangler d1 migrations apply studyops-db-prod --remote --env production
```

### 개발 서버 실행
```bash
# 클라이언트 (Vite, 포트 5173)
npm run dev -w apps/client

# 서버 (wrangler dev, 포트 8787, 로컬 D1)
npm run dev -w apps/server
```

### 빌드 / 타입체크
```bash
# 전체 타입체크 (루트)
npm run typecheck
# = tsc -b apps/server apps/client packages/shared (또는 각 워크스페이스 tsc --noEmit)

# 빌드
npm run build -w apps/client    # Vite → dist/
npm run build -w apps/server    # wrangler deploy --dry-run 또는 esbuild
```

### 배포
```bash
# 서버 secrets 등록 (최초 1회, 이후 갱신 시에만)
cd apps/server
npx wrangler secret put SESSION_SECRET
npx wrangler secret put TOSS_AUTH_MODE   # 'live'로 설정 시

# 서버 배포
npx wrangler deploy

# 클라이언트는 Vite 빌드 후 apps-in-toss 업로드 (granite/vite build → dist)
npm run build -w apps/client
```

### 루트 `package.json` 스크립트 (참고)
```json
{
  "name": "studyops-bot",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "dev:client": "npm run dev -w apps/client",
    "dev:server": "npm run dev -w apps/server",
    "build": "npm run build -w packages/shared && npm run build -w apps/server && npm run build -w apps/client",
    "typecheck": "tsc -b",
    "db:generate": "npm run -w apps/server exec -- drizzle-kit generate",
    "db:apply:local": "npm run -w apps/server exec -- wrangler d1 migrations apply studyops-db --local",
    "db:apply:remote": "npm run -w apps/server exec -- wrangler d1 migrations apply studyops-db --remote"
  }
}
```

---

## 4-9. 구현 우선순위 / 에이전트 작업 분할

3명의 executor가 **파일 경로가 겹치지 않게** 병렬 작업.

### Executor-X (공유/글루) — **먼저 완료되어야 S/C 착수 가능**
**소유 파일 (이 경로만 수정):**
- `package.json` (루트)
- `tsconfig.base.json` (루트)
- `.gitignore` (루트)
- `README.md` (루트)
- `packages/shared/**` 전체

**산출물:**
1. 루트 워크스페이스 설정 (npm workspaces, tsconfig paths로 `@studyops/shared` 별칭).
2. `packages/shared/src/` 의 모든 DTO/엔티티/에러 타입 정의 (4-3의 모든 인터페이스).
3. 루트 README에 셋업/개발/배포 요약.
4. `.gitignore` (node_modules, dist, .wrangler, .dev.vars, .env).

**완료 기준:** `npm install && npm run typecheck` 가 빈 서버/클라이언트 stub 상태에서도 통과.

### Executor-S (서버)
**소유 파일 (이 경로만 수정):**
- `apps/server/**` 전체

**산출물:**
1. Hono 엔트리 + 미들웨어 (auth, error, requestId, cors).
2. Drizzle 스키마 (`db/schema.ts`) + 마이그레이션 생성.
3. Toss 인증 (`auth/toss.ts` dev/live 분기, `auth/routes.ts`).
4. 세션 JWT (`lib/session.ts`).
5. 라우트: studies, rounds, submissions, status, reminder-message, share-discord.
6. Discord webhook (`discord/webhook.ts`).
7. `wrangler.jsonc` (env.production 포함), `.dev.vars.example`, `drizzle.config.ts`, `boot-check.ts`.

**외부 의존:** `@studyops/shared`에서 타입 import. shared가 준비 안 됐으면 임시 로컬 타입으로 진행 후 교체.

**완료 기준:** `wrangler dev` 로컬에서 모든 엔드포인트 curl 테스트 통과 (dev 모드).

### Executor-C (클라이언트)
**소유 파일 (이 경로만 수정):**
- `apps/client/**` 전체

**산출물:**
1. Vite + React + TDS 셋업 (`package.json`, `vite.config.ts`, `tsconfig.json`).
2. `granite.config.ts`.
3. `TDSMobileAITProvider` + `SessionProvider` + 라우터.
4. 모든 화면 페이지 (Login, Studies, StudyDetail, RoundDetail, SubmissionCreate, Reminder).
5. API 클라이언트 (`api/client.ts` + 도메인별 래퍼).
6. `appLogin()` 연동.
7. `.env` (`VITE_API_BASE_URL`).

**외부 의존:** `@studyops/shared`에서 타입 import. 서버 엔드포인트는 4-3 스펙 기준으로 목업 없이 직접 호출 (Executor-S와 동시 진행 시 임시 mock 데이터로 UI 먼저 완성 가능).

**완료 기준:** `npm run dev -w apps/client` 로 모든 화면 플로우 동작 (서버 dev 모드 연결).

### 병렬 진행 순서
```
T0 ──► Executor-X (shared + 루트 글루)
        │
        ├─ (shared 완료 후) ──► Executor-S (서버)  ┐
        │                      Executor-C (클라)  ├─ 병렬
        │                                          ┘
T1 ──► 통합 테스트 (서버+클라 연결)
```

> Executor-X는 최우선. S/C는 shared가 먼저 병합되어야 정확한 타입 사용 가능. 단 S/C는 shared 대기 중에도 각자 stub 타입으로 진행 가능 (나중에 import 경로만 교체).

---

## 4-10. 리스크 & 결정 근거

### R1. mTLS 없이 개발하는 방법 (dev 모드)
**리스크:** Toss 프로덕션 API는 mTLS 인증서 필요. 발급 절차가 무거워 MVP 로컬 개발에서 사용 불가.
**결정:** `TOSS_AUTH_MODE=dev|live` 환경변수로 분기.
- `dev`: Toss API 호출 스킵. 인가코드 형식 `dev-<userKey>` 를 파싱해 userKey 확보 (또는 고정값 1). 비즈니스 로직 전부 실제 동작.
- `live`: 실제 OAuth2 플로우. 프로덕션 배포 전 mTLS 인증서 발급 후 `TOSS_AUTH_MODE=live` + secret 바인딩.
**근거:** 인증만 분기하고 비즈니스 로직은 동일 → dev에서 검증한 로직이 live에서 그대로 동작.

### R2. TDS가 `@emotion/react` 의존성 → 번들 사이즈
**리스크:** TDS Mobile은 emotion 기반. Vite 번들에 emotion runtime 포함 → 초기 번들 증가.
**결정:** 
- Vite `build.rollupOptions.output.manualChunks`로 tds/emotion 분리.
- `@toss/tds-mobile-ait` Provider는 앱 루트 1회만.
- MVP 단계에서는 번들 사이즈 최적화보다 기능 완성 우선. 8/5 데모 이후 Lighthouse 측정 후 결정.
**근거:** 앱인토스 WebView 환경은 모바일이지만 토스 앱 캐싱 인프라 활용 가능. 사전 최적화 금지.

### R3. D1 로컬 개발 (`wrangler dev --local-d1`) 주의점
**리스크:** 
- D1 로컬은 `--local` 플래그로 `.wrangler/state/v3/d1/` 에 SQLite 파일 생성.
- 마이그레이션 적용 시 `--local` 생략하면 원격 DB에 적용됨 (위험).
- D1은 SQLite 기반이라 일부 SQL 기능(MySQL/Postgres 호환) 제한. 예: `RETURNING *` 지원, 트랜잭션 제한적.
**결정:**
- 모든 로컬 마이그레이션 명령은 `--local` 명시.
- Drizzle ORM 사용 → SQL 직접 작성 최소화, D1 호환성은 Drizzle이 보장.
- 타임스탬프를 `integer`(ms)로 통일 → D1 datetime 호환성 이슈 회피.
- `.wrangler/` 는 `.gitignore`에 추가 (상태 파일 커밋 금지).

### R4. 세션 토큰 저장 위치 (토스 정책)
**리스크:** 토스 앱 문서상 민감정보는 서버 보관 원칙. 클라이언트 장기 저장 금지.
**결정:**
- `sessionToken`: `sessionStorage` (앱/탭 생명주기). `localStorage` 절대 사용 금지.
- `user` 객체: React Context 메모리 전용. `sessionStorage` 캐시 안 함.
- JWT 만료 7일. 만료 시 `/auth/login` 재호출 (appLogin → 자동). 사용자 경험 부드럽게 유지.
- MVP는 stateless JWT (블랙리스트 없음). `/auth/logout`은 클라이언트 토큰 폐기만. 추후 D1에 refresh 토큰 테이블 추가 가능.
**근거:** 토스 정책 준수 + 구현 단순성. 7일 JWT는 MVP 검증 기간에 충분.

### R5. participants와 submissions의 관계 (회차별 vs 스터디별)
**결정:** participants는 **스터디 단위** 등록 (회차별 아님). 회차 현황은 "해당 스터디의 전체 참여자 - 회차 제출자 = 미제출자"로 계산.
**근거:** 운영자가 매 회차마다 참여자를 다시 등록하는 건 비효율. 스터디 멤버는 안정적. 신규/이탈자는 participants 테이블에서 추가/삭제.
**트레이드오프:** 회차 사이에 참여자 변동이 있으면 과거 회차 현황이 왜곡될 수 있으나, MVP에서는 무시 (참여자 snapshot은 차후 과제).

### R6. UNIQUE(roundId, participantId) 제약
**결정:** 회차당 참여자 1제출만 허용. 중복 제출 시 409 CONFLICT.
**근거:** MVP 단순성. "1회차에 2개 제출" 케이스는 드물고, 필요하면 note 필드로 보완. 다중 제출은 나중으로 미룸.

---

## 부록 A: 핵심 의존성 버전 (구현 시작점)

```json
// apps/server/package.json (주요 의존성)
{
  "dependencies": {
    "hono": "^4.6.0",
    "drizzle-orm": "^0.36.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241101.0",
    "drizzle-kit": "^0.28.0",
    "wrangler": "^3.90.0",
    "typescript": "^5.6.0"
  }
}
```

```json
// apps/client/package.json (주요 의존성)
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.28.0",
    "@toss/tds-mobile": "latest",
    "@toss/tds-mobile-ait": "latest",
    "@emotion/react": "^11.13.0",
    "@apps-in-toss/web-framework": "latest",
    "@studyops/shared": "*"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0",
    "typescript": "^5.6.0"
  }
}
```

> `@toss/*`, `@apps-in-toss/*` 버전은 앱인토스 개발자센터의 최신 안정판 사용. 위는 시작점이며 실제 설치 시점의 최신으로 조정.

---

## 부록 B: 에이전트 작업 지시문 템플릿

아래 3개 지시문을 각 executor에게 그대로 전달.

---

**[Executor-X 작업 지시문]**
> `app-intoss-study-workspace` 저장소의 루트와 `packages/shared/` 를 구축하세요. `docs/ARCHITECTURE.md`의 4-1(디렉토리 구조), 4-3(API DTO), 4-9(Executor-X 소유 파일)를 따르세요. npm workspaces 모노레포 설정(`packages/*`, `apps/*`), `tsconfig.base.json`에 `@studyops/shared` 경로 별칭, `.gitignore`, 루트 `package.json` 스크립트(dev/build/typecheck/db:*)를 작성하세요. `packages/shared/src/`에 모든 엔티티·DTO·에러 타입을 정의하고 `index.ts`에서 re-export하세요. 완료 기준: `npm install && npm run typecheck`가 통과할 것. 서버/클라이언트는 빈 stub 상태로 두고 본인이 소유한 파일만 수정하세요.

---

**[Executor-S 작업 지시문]**
> `apps/server/` 를 구축하세요. `docs/ARCHITECTURE.md`의 4-2(스키마), 4-3(API), 4-4(인증), 4-6(Discord), 4-7(환경변수), 4-8(명령)을 따르세요. Hono + Drizzle ORM + Cloudflare Workers + D1 조합으로, `src/index.ts`에 라우트 마운트, `db/schema.ts`에 5개 테이블(users/studies/rounds/participants/submissions), `auth/toss.ts`에 dev/live 분기 인증, `lib/session.ts`에 HS256 JWT, `routes/`에 모든 엔드포인트를 구현하세요. `wrangler.jsonc` (env.production 포함), `.dev.vars.example`, `drizzle.config.ts`, `boot-check.ts`를 작성하고 `wrangler d1 create` → `drizzle-kit generate` → `--local` 적용까지 로컬에서 검증하세요. 완료 기준: `TOSS_AUTH_MODE=dev`로 `wrangler dev` 후 모든 엔드포인트 curl 테스트 통과. `@studyops/shared` 타입 import. `apps/server/**` 외 수정 금지.

---

**[Executor-C 작업 지시문]**
> `apps/client/` 를 구축하세요. `docs/ARCHITECTURE.md`의 4-5(화면/라우팅), 4-7(환경변수), 부록 A(의존성)를 따르세요. Vite + React 18 + TypeScript + `@toss/tds-mobile` + `@apps-in-toss/web-framework` 조합으로, `granite.config.ts`, `TDSMobileAITProvider`로 감싼 `main.tsx`, React Router v6 라우트 6개(로그인/스터디목록/스터디상세/회차상세/제출등록/리마인드), 각 페이지 TDS 컴포넌트 구성, `api/client.ts`(Bearer 토큰 주입 fetch 래퍼)와 도메인 API 함수, `appLogin()` 연동을 구현하세요. 세션 토큰은 `sessionStorage` 저장(토스 정책상 localStorage 금지). 완료 기준: `npm run dev -w apps/client`로 6개 화면 플로우가 동작(서버 dev 모드 연결). `@studyops/shared` 타입 import. `apps/client/**` 외 수정 금지.
