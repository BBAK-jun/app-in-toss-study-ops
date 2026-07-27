# HARNESS — StudyOps Bot Execution Contract

> **AI 에이전트(Sisyphus/Codex/etc.)가 이 저장소에서 작업하기 전 반드시 먼저 읽는 실행 컨텍스트 계약서.**
> 비결정적인 AI 행위를 최소한의 규칙으로 통제하며, PRD/ARCHITECTURE를 대체하지 않고 그 위에서 작동한다.
> 작성일: 2026.07.26 KST · 버전: 1.0

---

## 1. 제품 비전 (1문장)

> 스터디장과 커뮤니티 운영자가 매주 반복하는 **제출 확인 → 미제출자 정리 → 리마인드 → 현황 공유** 흐름을 Discord 중심으로 끝내주는 운영 자동화 도구.

- **타겟 사용자**: 작은 스터디·커뮤니티 운영자 (거창한 기업 X)
- **핵심 가치**: 운영자가 사람에게 집중하게, 반복 체크는 봇에게
- **검증 기준**: "이거 우리 스터디에 붙이면 편하겠다"는 반응
- **마일스톤**: 2026.08.05 데모 (앱인토스 메이커 스프린트)

상세는 `docs/PRD-StudyOps-Bot.md`, 설계는 `docs/ARCHITECTURE.md` 참조.

---

## 2. 현재 Sprint 상태 (업데이트 섹션)

> **이 섹션은 매 작업 세션 시작 전/후에 업데이트된다.** AI는 작업 시작 전 반드시 읽고 컨텍스트를 잡는다.

- **Sprint**: S2 — MVP 1차 완료 → 하네스 환경 구축 → 2차 기능 고도화 & 파일럿 준비
- **기간**: 2026.07.15 ~ 2026.08.05
- **완료된 것** (MVP 1차, 7/12~7/15):
  - [x] 인증 (Toss OAuth2 dev/live 분기)
  - [x] 스터디/회차/참여자/제출 CRUD
  - [x] 회차별 제출 현황 (제출률 자동 계산)
  - [x] 리마인드 문구 생성 + Discord Webhook 발송
  - [x] QA 8개 화면 검증 (로그인 → 스터디 생성 → 회차 상세 → 제출 → 리마인드 → Discord 발송)
- **완료된 것** (하네스 환경, 7/26):
  - [x] `HARNESS.md` 실행 컨텍스트 계약서 작성 (10개 섹션)
  - [x] `docs/wiki/` Astro v5 정적 사이트 셋업 (5개 콘텐츠 컬렉션)
  - [x] `.omo/run-continuation/` 세션 10개 자동 인덱싱
  - [x] 루트 `qa-*.png` 13개 파일 구조화 → `public/qa/legacy/`
  - [x] MVP 1차 결정 4개 ADR로 분해 (Cloudflare, Toss auth, 모노레포, 하네스)
  - [x] `pnpm wiki:{dev,build,index}` 스크립트 등록
- **완료된 것** (환경 분리 + D1 격리 + CI/CD, 7/26):
  - [x] `wrangler.toml` → `wrangler.jsonc` 마이그레이션 + `env.production` 블록
  - [x] D1 인스턴스 2개 운영 (dev/prod 격리, prod D1 마이그레이션 적용 완료)
  - [x] GitHub Actions CI/CD 파이프라인 (ci.yml + deploy.yml + migrate-prod.yml)
  - [x] 부트 타임 fail-fast 검증 (`boot-check.ts`)
  - [x] ADR 4건 (env 전략 / D1 격리 / 배포 게이트 / MCP 통합)
  - [x] Wiki 에피소드 페이지 + notion MCP 화이트리스트 추가
- **완료된 것** (Worker MCP 서버, 7/26):
  - [x] `StudyOpsMcpAgent` DO (McpAgent 상속, read-only 5개 도구)
  - [x] `/mcp` 엔드포인트 + Bearer token 인증 (`MCP_API_TOKEN`)
  - [x] boot-check prod 검증 (MCP_API_TOKEN 필수)
  - [x] ADR-010 (agents-sdk + MCP SDK + zod3 의존성 결정)
  - [x] zod v3/v4 공존 (agents는 v4 peer dep, MCP SDK는 v3 — npm alias `zod3`로 해결, pnpm에서도 동일 문법 지원)
- **다음 우선순위**:
  1. 파일럿 사용자 1명 확보 (앱인토스 내부 스터디)
  2. GitHub Actions Secrets 등록 (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
  3. 8/5 데모 시연 흐름 다듬기
  4. MCP 클라이언트 설정 (Sisyphus → `/mcp` 엔드포인트 연결)
  5. GitHub remote 설정 + PR 머지 (env-separation-d1-isolation 브랜치)
- **일시 중단 / 후순위**: 멀티테넌트 SaaS, 결제, Notion 연동, AI 요약 고도화

---

## 3. 결정론적 규칙

> **매 작업 세션이 동일한 해석, 동일한 산출물 품질을 내도록 강제하는 규칙.**
> AI는 이 규칙에서 벗어나는 변경을 제안하지 않는다. 벗어나야 한다면 먼저 ADR(Architecture Decision Record)로 결정을 남긴다.

### 3.1 스택 고정 (변경 금지)

| 레이어 | 기술 | 비고 |
|---|---|---|
| 서버 런타임 | Cloudflare Workers | `compatibility_date = "2024-11-01"`, `nodejs_compat` |
| 서버 프레임워크 | Hono | 라우트 그룹 + 미들웨어 패턴 유지 |
| DB | Cloudflare D1 (SQLite) | 로컬은 `.wrangler/state/v3/d1/` |
| ORM | Drizzle ORM | 마이그레이션은 항상 `--local` 먼저 |
| 인증 | Toss OAuth2 (`appLogin`) + 자체 HS256 JWT (7일) | dev/live 분기, `localStorage` 절대 금지 |
| 클라이언트 | Vite + React 18 + TypeScript | `jsx: react-jsx` |
| UI 키트 | `@toss/tds-mobile` + `@toss/tds-mobile-ait` | emotion runtime 1회 Provider 중첩 |
| 앱 프레임워크 | `@apps-in-toss/web-framework` | `granite.config.ts` 유지 |
| 배포 | `wrangler deploy` (서버) / Vite build → 앱인토스 업로드 (클라) | |
| 공유 타입 | `packages/shared` (`@studyops/shared`) | 서버·클라 동일 DTO |

**금지**: 다른 프레임워크/ORM/DB 도입, 추상화 레이어 추가 (Repository 패턴 등), "미래 확장성"을 위한 인터페이스 도입.

### 3.2 코딩 컨벤션

**타입 안전성 (절대 원칙)**:
- `as any`, `@ts-ignore`, `@ts-expect-error` **절대 금지**
- 타입 단언보다 타입 가드 / zod 검증 사용
- `unknown` 수용, `any` 거부

**오류 처리**:
- 빈 catch 블록 금지 (`catch (e) {}` X)
- 모든 외부 호출 (fetch, D1, Discord)은 `HttpError`로 정규화 (`lib/http-error.ts` 패턴)
- 에러 응답은 `ApiErrorResponse` 포맷 준수 (`packages/shared/src/errors.ts`)

**파일 규약**:
- 한 파일당 순수 코드 250줄 이상 시 분할 검토 (MVP 단계에선 400줄까지 허용)
- 새 파일 추가 시 인라인 주석으로 역할 한 줄 요약 (ARCHITECTURE 4-1 관례)
- `index.ts`는 re-export만, 비즈니스 로직 금지

**타임스탬프**: 모든 `createdAt`, `dueAt`은 **epoch milliseconds (integer)**. `Date.now()` 사용. D1 datetime 사용 금지.

**ID 관례**: Toss `userKey`만 `number` PK. 나머지 엔티티는 `crypto.randomUUID()` (`text`).

**명명**:
- 파일: `camelCase.ts` (라이브러리), `PascalCase.tsx` (컴포넌트/페이지)
- 변수/함수: `camelCase`
- 타입/인터페이스: `PascalCase`, `I` 접두사 금지
- 상수: `UPPER_SNAKE_CASE`
- DB 컬럼: `snake_case` (Drizzle schema에서 명시)

**테스트**:
- MVP 단계: e2e QA 스크린샷 + curl 스크립트로 검증. 유닛 테스트는 회귀 위험이 있는 핵심 로직에만 (예: rate 계산, reminder 메시지 생성).
- 향후: Vitest + Miniflare D1 testing 도입 검토 (8/5 이후).

### 3.3 스킬 라우팅 테이블

> **작업 유형 → 필수 로드 스킬**. AI는 매 작업마다 이 테이블을 조회하고, 해당 스킬을 `load_skills`에 포함한다.

| 작업 유형 | 트리거 키워드 | 필수 스킬 |
|---|---|---|
| Cloudflare Workers 코드 | wrangler, Workers, D1, KV, R2 | `wrangler`, `workers-best-practices` |
| Durable Objects / 상태ful | DO, alarm, websocket, coordination | `durable-objects` |
| Agents SDK / 워크플로 | Agent, RPC, durable workflow | `agents-sdk` |
| Cloudflare 일반 | Tunnel, WAF, Pages, 이메일 | `cloudflare` / `cloudflare-email-service` |
| 프론트엔드 / UI / 디자인 | 컴포넌트, 스타일, 페이지, redesign | `frontend` (내장) + `visual-engineering` 카테고리 |
| 시각적 QA / 스크린샷 검증 | looks right, screenshot diff, UI 점검 | `visual-qa` (내장) |
| 웹 성능 / Lighthouse | LCP, INP, CLS, 번들 | `web-perf` |
| 보안 리뷰 | security, 취약점, 인증 점검 | `security-research` (내장) |
| 디버깅 | broken, error, 안 됨, 원인 | `debugging` (내장) |
| Git 작업 / 히스토리 | commit, rebase, bisect, blame | `git-master` (내장) |
| 코드 품질 정리 | slop, AI 냄새 제거, cleanup | `remove-ai-slops` (내장) |
| 계획 / 분해 | plan, 설계, 분해 | Metis → Momus → Prometheus 시퀀스 |

**스킬 생략 금지**: 해당 작업에 맞는 스킬을 빼먹으면 안 됨. 더 좋은 결과를 위해 `load_skills=[...]`에 명시.

### 3.4 MCP 화이트리스트

| MCP | 용도 | 강제 사용 시점 |
|---|---|---|---|
| `codegraph` | 심볼/레퍼런스 탐색 | 기존 심볼 수정 전 **반드시** (caller/callee 파악) |
| `context7` | 외부 라이브러리 docs | 모르는 API/패키지 사용 시 |
| `playwright` | 브라우저 자동화 / QA | 화면 동작 검증, 스크린샷 캡처 |
| `linear` | 이슈/PR 추적 | 위키 changelog 동기화 (Phase 2) |
| `notion` | 위키 문서 생성/업데이트 | 에피소드/ADR/문서 작성 시 |
| `open-design` | 디자인 산출물 | mockup 변경, 새 화면 디자인 |

**Anti-pattern**: codegraph를 둔 상태에서 raw grep/read로 심볼을 찾는 행위 금지. codegraph가 인덱싱한 파일은 `codegraph_node(file=...)`로 읽는다.

---

## 4. 절대 금지 사항

1. **타입 우회**: `as any`, `@ts-ignore`, `@ts-expect-error`, non-null 단언(`!`) 남용
2. **빈 catch**: `catch (e) {}` 또는 의미 없는 `catch (e) { console.log(e) }`
3. **`localStorage` 사용**: 토스 정책상 금지. 세션은 `sessionStorage` 만.
4. **의미 없는 추상화**: 한 곳에서만 쓰는 유틸리티/헬퍼/인터페이스 만들지 않기
5. **문서 자동 생성 스킵**: PRD/ARCHITECTURE 없이 코드만 작성하지 않기
6. **배포 자동화**: 명시적 승인 없이 `wrangler deploy` / git push 금지
7. **테스트 삭제**: 실패하는 테스트 지워서 "통과"시키지 않기
7. **새 의존성 추가**: package.json에 새 패키지 추가 전 ADR 필수 (특히 번들 사이즈 영상 큰 패키지)
8. **MVP 범위 확장**: PRD의 "나중으로 미룰 것" 리스트 (결제, Slack, Notion, 멀티테넌트 등)에 들어가는 기능 구현 금지

---

## 5. 산출물 규약 (매 작업 후 반드시 남길 것)

> 모든 작업 단위(episode)는 다음 산출물을 남겼을 때 완료로 간주한다.

### 5.1 위키 에피소드 페이지

경로: `docs/wiki/src/content/episodes/YYYY-MM-DD-<slug>.md`

```yaml
---
id: 2026-07-26-harness-setup
title: 하네스 환경 초기 구축
type: docs           # feature | bug | refactor | docs | infra | qa
status: in-progress  # planned | in-progress | review | shipped
startedAt: 2026-07-26T11:00:00+09:00
shippedAt: null
sessionIds:          # .omo/run-continuation 세션 ID
  - ses_063ccacb4ffeKsEzR50sYZfjUI
relatedDecisions:    # ADR id
  - adr-001
touchedFiles:
  - HARNESS.md
  - docs/wiki/package.json
linearIssue: null    # Phase 2
githubPR: null       # Phase 2
---

## 목표
이 에피소드에서 해결한 것 (1-2문장).

## 변경 내역
- 파일별 요약 (what/why)

## 검증
- 어떻게 동작을 확인했는지 (스크린샷, 테스트, curl 출력)

## 메모 / 다음에 할 것
- 후속 작업 힌트, 남은 이슈
```

### 5.2 QA 증거 (UI 변경 시)

- 스크린샷은 `docs/wiki/public/qa/<episode-slug>/` 디렉토리에 정리
- 기존 `qa-*.png` 루트 파일들은 인덱싱 스크립트가 `docs/wiki/public/qa/legacy/`로 이동
- 새 항목은 `qa` 컬렉션에 메타데이터 등록 (자동/수동)

### 5.3 ADR (아키텍처 결정 변경 시)

경로: `docs/wiki/src/content/decisions/adr-NNN-<slug>.md`

템플릿: Context / Decision / Consequences / Alternatives.

### 5.4 변경 로그

`docs/wiki/src/content/changelog/` 에 자동 생성 (git hook 또는 스크립트). 수동 작성 금지 — 이건 데이터로 만들어지는 부분.

---

## 6. 의사결정 원칙 (우선순위 순)

1. **단순성 > 유연성** — 과잉 추상화·과잉 설정 금지 (PRD 정신)
2. **Toss 식별자 = 진실** — `userKey`(number)가 사용자 PK. 자체 ID 체계 만들지 않는다.
3. **dev/live 분기는 인증만** — 비즈니스 로직은 분기 없음.
4. **타입 공유** — 서버·클라이언트가 `packages/shared`의 동일 DTO 사용.
5. **복붙 가능한 문서** — `docs/ARCHITECTURE.md` 코드 블록은 그대로 파일에 넣으면 동작해야 함.
6. **MVP 정신** — 완성보다 검증. 기능 욕심 줄이기.
7. **회피 말고 결정** — 모호하면 ADR로 결정 남기고 진행. "나중에 결정" 금지.
8. **좁게 파고들기** — "스터디 제출 운영" 좁은 문제에 집중. 넓은 커뮤니티 자동화는 8/5 이후.

---

## 7. 위키 업데이트 규칙

- **매 작업 종료 시**: 에피소드 페이지 작성 (위 5.1)
- **Sprint 전환 시**: 이 파일(HARNESS.md) §2 "현재 Sprint 상태" 업데이트
- **아키텍처 결정 시**: ADR 작성 후 관련 코드 변경
- **수동 위키 페이지 작성 금지 영역**: `sessions/`, `changelog/` (자동 생성됨)

위키 사이트:
- 로컬 미리보기: `pnpm wiki:dev` (루트에서)
- 빌드: `pnpm wiki:build` → `docs/wiki/dist/`
- 인덱싱 (세션·QA 동기화): `pnpm wiki:index`

---

## 8. 에이전트 작업 시퀀스 (Sisyphus 우선)

모든 작업 세션은 다음 시퀀스를 따른다:

1. **HARNESS.md 읽기** (이 파일)
2. **§2 현재 Sprint 상태 확인** — 지금 우선순위가 뭔지
3. **§3 규칙 확인** — 작업 유형에 맞는 스킬·MCP 로드
4. **필요시 Metis 상담** — 복잡하거나 모호한 요청
5. **구현** — 위키 에피소드 초안을 먼저 `episodes/`에 작성 (목적 명확화)
6. **검증** — `pnpm typecheck`, 관련 테스트, QA 스크린샷 (UI 변경 시)
7. **위키 업데이트** — 에피소드 status → `shipped`, 검증 결과 첨부
8. **(선택) ADR** — 결정이 ARCHITECTURE에서 벗어나면 기록

---

## 9. 위키 URL 구조 (설계)

```
/                          # 대시보드 (타임라인 + 통계)
/episodes                  # 작업 에피소드 목록
/episodes/[slug]           # 개별 에피소드 상세
/decisions                 # ADR 목록
/decisions/[slug]          # 개별 ADR
/qa                        # QA 갤러리 (스크린샷 + 메타데이터)
/sessions                  # .omo 세션 인덱스 (자동)
/changelog                 # 외부 연동 캐시 (Linear/PR/Discord, Phase 2)
```

---

## 10. 변경 이력

| 날짜 | 버전 | 변경 |
|---|---|---|
| 2026.07.26 | 1.0 | 최초 작성. HARNESS v1 확정. |
| 2026.07.26 | 1.1 | §2 Sprint 상태 업데이트 (하네스 환경 구축 완료). ADR-005 (watchexec + launchd 자동화) 추가. |
| 2026.07.26 | 1.2 | §2 Sprint 업데이트 (환경 분리 완료), §3.4 MCP 화이트리스트에 notion 추가. ADR-006~009. |
| 2026.07.26 | 1.3 | §2 Sprint 업데이트 (Worker MCP 서버 완료). ADR-010 (agents-sdk + MCP SDK + zod3 의존성, StudyOpsMcpAgent DO). |
