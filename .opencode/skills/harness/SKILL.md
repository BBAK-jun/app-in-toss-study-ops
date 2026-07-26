# Harness Automation Skill

> **StudyOps Bot 프로젝트의 하네스(HARNESS.md)를 자동으로 관리하고 여러 세션 간 상태를 일관되게 유지하는 스킬.**

## 목적

AI 에이전트(Sisyphus/Codex/etc.)가 매 세션에서 **동일한 실행 컨텍스트**를 바라보고 **결정론적인 작업**을 수행하도록 강제합니다.

- HARNESS.md 자동 로드 및 컨텍스트 설정
- 세션 간 상태 공유 (.omo/run-continuation/)
- 위키 에피소드 페이지 작성 가이드
- 스킬 라우팅 테이블 자동 참조

---

## 언제 사용 (트리거)

- **세션 시작 시** — HARNESS.md 로드, Sprint 상태 확인
- **작업 시작 전** — 스킬 라우팅 테이블 조회
- **작업 종료 후** — 에피소드 페이지 작성, 위키 인덱싱
- **하네스 관련 질문** — 규칙, 규약, 원칙 확인 시

---

## 하네스 구조 (HARNESS.md 10개 섹션)

```
1. 제품 비전 (1문장)
   → 스터디 운영 자동화 도구: 제출 확인 → 리마인드 → 현황 공유

2. 현재 Sprint 상태 (업데이트 섹션)
   → Sprint: S2, 기간: 7/15~8/5, 완료된 것, 다음 우선순위
   → 이 섹션은 매 작업 세션 시작 전/후에 업데이트된다

3. 결정론적 규칙
   → 스택 고정 (Workers, Hono, D1, Drizzle, Toss auth, React 18, TDS Mobile)
   → 코딩 컨벤션 (타입 안전성, 오류 처리, 파일 규약, 타임스탬프, ID 관례, 명명, 테스트)
   → 스킬 라우팅 테이블 (작업 유형 → 필수 스킬)
   → MCP 화이트리스트

4. 절대 금지 사항
   → 타입 우회, 빈 catch, localStorage 사용, 의미 없는 추상화, 등

5. 산출물 규약 (매 작업 후 반드시 남길 것)
   → 위키 에피소드 페이지 (episodes/YYYY-MM-DD-<slug>.md)
   → QA 증거 (public/qa/<episode-slug>/)
   → ADR (decisions/adr-NNN-<slug>.md)
   → 변경 로그 (changelog/ — 자동 생성)

6. 의사결정 원칙 (우선순위 순)
   → 단순성 > 유연성, Toss 식별자 = 진실, dev/live 분기는 인증만, 등

7. 위키 업데이트 규칙
   → 매 작업 종료 시: 에피소드 페이지 작성
   → Sprint 전환 시: HARNESS.md §2 업데이트
   → 아키텍처 결정 시: ADR 작성

8. 에이전트 작업 시퀀스 (Sisyphus 우선)
   → HARNESS.md 읽기 → §2 Sprint 상태 확인 → §3 규칙 확인
   → Metis 상담 → 구현 → 검증 → 위키 업데이트 → ADR

9. 위키 URL 구조 (설계)
   → / (대시보드), /episodes, /decisions, /qa, /sessions, /changelog

10. 변경 이력
    → 버전, 날짜, 변경 내역
```

---

## 세션 시작 자동화

### 1단계: HARNESS.md 로드

```markdown
📋 HARNESS.md 로드 중...
```

- `HARNESS.md`의 §2 "현재 Sprint 상태" 확인
- 우선순위 파악 (완료된 것, 다음 우선순위)
- 현재 세션의 작업 목표 설정

### 2단계: 스킬 라우팅 테이블 조회

작업 유형에 따라 자동으로 스킬 로드:

| 작업 유형 | 트리거 키워드 | 필수 스킬 |
|---|---|---|
| Cloudflare Workers | wrangler, Workers, D1 | `wrangler`, `workers-best-practices` |
| Durable Objects | DO, alarm, websocket | `durable-objects` |
| Agents SDK | Agent, RPC, workflow | `agents-sdk` |
| 프론트엔드/디자인 | component, style, page | `frontend`, `visual-engineering` |
| 시각적 QA | looks right, screenshot | `visual-qa` |
| 웹 성능 | Lighthouse, LCP, INP | `web-perf` |
| 보안 리뷰 | security, vulnerability | `security-research` |
| 디버깅 | broken, error, bug | `debugging` |
| Git 작업 | commit, rebase | `git-master` |
| 코드 정리 | slop, cleanup | `remove-ai-slops` |
| 계획 | plan, design, architecture | `harness`, Metis → Momus → Prometheus |

### 3단계: MCP 화이트리스트 확인

| MCP | 용도 | 강제 사용 시점 |
|---|---|---|
| `codegraph` | 심볼/레퍼런스 탐색 | **기존 심볼 수정 전 반드시** |
| `context7` | 외부 라이브러리 docs | 모르는 API/패키지 사용 시 |
| `playwright` | 브라우저 자동화 / QA | 화면 동작 검증, 스크린샷 캡처 |
| `notion` | 위키 문서 생성/업데이트 | 에피소드/ADR/문서 작성 시 |

---

## 작업 종료 자동화

### 1단계: 에피소드 페이지 작성

**경로**: `docs/wiki/src/content/episodes/YYYY-MM-DD-<slug>.md`

**템플릿**:

```yaml
---
id: 2026-07-26-harness-automation
title: 하네스 자동화 구축
type: feature          # feature | bug | refactor | docs | infra | qa
status: shipped        # planned | in-progress | review | shipped
startedAt: 2026-07-26T11:00:00+09:00
shippedAt: 2026-07-26T19:30:00+09:00
sessionIds:            # .omo/run-continuation 세션 ID
  - ses_063ccacb4ffeKsEzR50sYZfjUI
relatedDecisions:      # ADR id
  - adr-001
touchedFiles:
  - .opencode/opencode.jsonc
  - .opencode/skills/harness/SKILL.md
linearIssue: null      # Phase 2
githubPR: null         # Phase 2
---

## 목표

OpenCode 훅과 스킬로 하네스 자동화를 구축하여 여러 세션 간 상태를 일관되게 유지.

## 변경 내역

- `.opencode/opencode.jsonc` 생성:
  - 세션 시작/종료 훅 (pre-session/post-session)
  - 스킬 라우팅 테이블 (작업 유형 → 필수 스킬)
  - MCP 화이트리스트 (codegraph, context7, playwright, notion)
  - 금지된 작업 패턴 (as any, localStorage, wrangler deploy)

- `.opencode/skills/harness/SKILL.md` 생성:
  - 하네스 구조 설명 (10개 섹션)
  - 세션 시작/종료 자동화 프로세스
  - 에피소드 페이지 템플릿
  - 위키 인덱싱 명령어

## 검증

- 세션 시작 시 HARNESS.md 자동 로드 확인
- 스킬 라우팅 테이블 참조 확인
- 에피소드 페이지 작성 가이드 표시 확인

## 메모 / 다음에 할 것

- 위키 인덱싱 자동화 스크립트 개선
- 세션 상태 저장소 동기화
- Linear/PR 연동 (Phase 2)
```

### 2단계: 위키 인덱싱

```bash
npm run wiki:index
```

이 명령어는 다음을 수행합니다:
- `.omo/run-continuation/` 세션 파일 → `docs/wiki/src/content/sessions/` 동기화
- `public/qa/` 스크린샷 → QA 컬렉션 메타데이터 등록

### 3단계: HARNESS.md 업데이트 (필요 시)

- §2 "현재 Sprint 상태" 업데이트
- 완료된 것 체크
- 다음 우선순위 수정
- 버전 번호 업데이트

---

## 금지된 작업 (절대 위반 금지)

```typescript
// ❌ 금지: 타입 우회
const data = response as any;

// ❌ 금지: 빈 catch
try {
  await something();
} catch (e) {}

// ❌ 금지: localStorage 사용
localStorage.setItem('token', token);

// ❌ 금지: @ts-ignore
// @ts-ignore
const result = dangerousFunction();

// ❌ 금지: 배포 자동화
await wrangler.deploy(); // 명시적 승인 없이 금지

// ❌ 금지: git push 자동화
await git.push(); // 명시적 승인 없이 금지
```

---

## 규칙 위반 감지

작업 중 다음 패턴이 발견되면 **즉시 중단**하고 HARNESS.md §4 "절대 금지 사항"을 확인하세요:

- `as any`
- `@ts-ignore`
- `@ts-expect-error`
- `localStorage`
- 빈 catch 블록
- 의미 없는 추상화
- 테스트 삭제

---

## 위키 사이트 접근

- 로컬 미리보기: `npm run wiki:dev` (포트 4321)
- 빌드: `npm run wiki:build` → `docs/wiki/dist/`
- 인덱싱: `npm run wiki:index`

---

## 상태 공유 저장소

세션 상태는 `.omo/run-continuation/`에 자동 저장됩니다:

```json
{
  "sessionID": "ses_063ccacb4ffeKsEzR50sYZfjUI",
  "updatedAt": "2026-07-26T02:46:09.203Z",
  "sources": {
    "background-task": {
      "state": "idle",
      "updatedAt": "2026-07-26T02:46:09.203Z"
    }
  }
}
```

다음 세션에서는 이 상태를 로드하여 이전 작업 컨텍스트를 유지합니다.

---

## 결정론적 보장

이 스킬이 로드되면 모든 세션에서:

1. ✅ **동일한 HARNESS.md**를 바라봄
2. ✅ **동일한 스킬 라우팅 테이블**을 참조
3. ✅ **동일한 금지 패턴**을 적용
4. ✅ **동일한 산출물 규약**을 따름
5. ✅ **동일한 위키 구조**를 유지

비결정적인 AI 행위가 최소화되고, **결정론적인 품질**이 보장됩니다.

---

## 도움말

- HARNESS.md 전체 보기: `cat HARNESS.md`
- 위키 에피소드 목록: `ls docs/wiki/src/content/episodes/`
- 세션 목록: `ls .omo/run-continuation/`
- 위키 로컬 미리보기: `npm run wiki:dev` → http://localhost:4321