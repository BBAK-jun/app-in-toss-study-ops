# Project Conventions — StudyOps Bot

이 파일은 이전에 `opencode.jsonc`에 들어있던 프로젝트 전용 메타데이터를
OpenCode 스키마 위반 없이 보존하기 위해 분리한 문서입니다.
OpenCode 설정(`opencode.jsonc`)에는 넣을 수 없는 커스텀 워크플로우 규칙을
에이전트가 참조용으로 사용합니다.

---

## 프로젝트 식별자

- **name**: StudyOps Bot

---

## 세션 훅 — 세션 시작/종료 시 자동 실행

### pre-session (세션 시작 전)

- `HARNESS.md` 로드 → 실행 컨텍스트 설정
  - 메시지: `📋 HARNESS.md loaded — Current Sprint: S2, MVP 1차 완료 → 하네스 환경 구축`

### post-session (세션 종료 후)

- 에피소드 페이지 작성 유도:
  - `💡 Remember to create episode page: docs/wiki/src/content/episodes/YYYY-MM-DD-<slug>.md`
  - `💡 Then run: npm run wiki:index`

> 참고: OpenCode의 `opencode.jsonc`는 `hooks` 키를 지원하지 않습니다.
> 세션 시작/종료 시 위 동작이 필요하면 OpenCode의 `instructions` 필드나
> `AGENTS.md` 지시어로 대체하는 것을 권장합니다.

---

## 스킬 라우팅 — 작업 유형별 자동 스킬 로드

| 트리거 키워드 | 로드할 스킬 |
|---|---|
| `wrangler`, `Workers`, `D1`, `KV`, `R2`, `deploy` | `wrangler`, `workers-best-practices` |
| `DO`, `durable`, `object`, `alarm`, `websocket`, `coordination` | `durable-objects` |
| `Agent`, `RPC`, `workflow`, `agents-sdk` | `agents-sdk` |
| `Tunnel`, `WAF`, `Pages`, `email`, `cloudflare` | `cloudflare`, `cloudflare-email-service` |
| `component`, `style`, `page`, `UI`, `design`, `redesign` | (카테고리: `visual-engineering`) |
| `looks right`, `screenshot`, `visual`, `QA` | `visual-qa` |
| `Lighthouse`, `LCP`, `INP`, `CLS`, `performance` | `web-perf` |
| `security`, `vulnerability`, `auth`, `취약점` | `security-research` |
| `broken`, `error`, `bug`, `fix`, `debug` | `debugging` |
| `commit`, `rebase`, `bisect`, `git` | `git-master` |
| `slop`, `cleanup`, `refactor`, `AI-generated` | `remove-ai-slops` |
| `plan`, `design`, `architecture` | `harness` (useMetis: true) |

> 참고: OpenCode는 `skillRouting` 키를 지원하지 않습니다.
> 에이전트는 이 표를 참고하여 키워드가 감지되면 해당 스킬을 직접 로드하세요.

---

## MCP 서버 사용 가이드 (화이트리스트)

| MCP 서버 | 설명 | 강제 여부 |
|---|---|---|
| `codegraph` | 심볼/참조 탐색 — 기존 심볼 편집 전 항상 사용 | ✅ enforced |
| `context7` | 외부 라이브러리 문서 — API/패키지에 익숙하지 않을 때 사용 | ❌ |
| `playwright` | 브라우저 자동화 / QA 스크린샷 | ❌ |
| `linear` | 이슈/PR 추적 (Phase 2) | ❌ |
| `notion` | 위키 문서 생성/업데이트 | ❌ |

> 참고: OpenCode는 `mcpWhitelist` 키 대신 `mcp` 객체를 사용합니다.
> 실제 MCP 서버 연결은 `opencode.jsonc`의 `mcp` 섹션에서 설정하세요.

---

## 금지된 작업 (forbiddenActions)

| 패턴 | 사유 |
|---|---|
| `as any` | 타입 안전성 위반 — type guard 사용 |
| `@ts-ignore` | 타입 안전성 위반 — TypeScript 에러를 억누르지 마세요 |
| `localStorage` | Toss 정책 위반 — `sessionStorage`만 사용 |
| `wrangler deploy` | 배포는 명시적 승인 필요 |
| `git push` | 푸시는 명시적 승인 필요 |

> 참고: OpenCode의 권한 제어는 `permission` / `tools` 키로 합니다.
> 위 규칙은 에이전트가 자율적으로 준수해야 할 정책입니다.

---

## 세션 상태 저장소

- **enabled**: true
- **path**: `.omo/run-continuation`
- **autoIndex**: true

---

## 위키 통합

- **enabled**: true
- **path**: `docs/wiki`
- **collections**: `episodes`, `decisions`, `sessions`, `qa`, `changelog`
- **indexScript**: `npm run wiki:index`
