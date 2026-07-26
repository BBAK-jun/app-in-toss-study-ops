---
id: 2026-07-26-harness-automation
title: 하네스 자동화 구축
type: infra
status: shipped
startedAt: 2026-07-26T19:20:00+09:00
shippedAt: 2026-07-26T19:30:00+09:00
sessionIds:
  - ses_063ccacb4ffeKsEzR50sYZfjUI
relatedDecisions: []
touchedFiles:
  - .opencode/opencode.jsonc
  - .opencode/skills/harness/SKILL.md
linearIssue: null
githubPR: null
---

## 목표

OpenCode 훅과 스킬로 하네스 자동화를 구축하여 여러 세션 간 상태를 일관되게 유지.

## 변경 내역

### `.opencode/opencode.jsonc` 생성 (162줄)

**세션 훅**:
- `pre-session`: HARNESS.md 자동 로드 + 컨텍스트 설정
- `post-session`: 에피소드 페이지 작성 유도

**스킬 라우팅 테이블** (작업 유형 → 필수 스킬):
- Cloudflare Workers → `wrangler`, `workers-best-practices`
- Durable Objects → `durable-objects`
- Agents SDK → `agents-sdk`
- 프론트엔드/디자인 → `frontend`, `visual-engineering`
- 보안 리뷰 → `security-research`
- 디버깅 → `debugging`
- Git 작업 → `git-master`
- 코드 정리 → `remove-ai-slops`
- 계획 → `harness`, Metis → Momus → Prometheus

**MCP 화이트리스트**:
- `codegraph` (강제): 기존 심볼 수정 전 반드시
- `context7`: 모르는 API/패키지 사용 시
- `playwright`: 화면 동작 검증, 스크린샷 캡처
- `notion`: 에피소드/ADR/문서 작성 시

**금지된 작업 패턴**:
- `as any`, `@ts-ignore`, `localStorage`
- `wrangler deploy`, `git push` (승인 없이)

**세션 상태 저장소**:
- `.omo/run-continuation/` 자동 인덱싱 (27개 세션)

### `.opencode/skills/harness/SKILL.md` 생성 (8.4KB)

하네스 자동화 스킬 — 다음 기능 포함:

**세션 시작 자동화**:
- HARNESS.md 로드
- Sprint 상태 확인
- 스킬 라우팅 테이블 조회
- MCP 화이트리스트 확인

**작업 종료 자동화**:
- 에피소드 페이지 작성 가이드
- 위키 인덱싱 (`npm run wiki:index`)
- HARNESS.md 업데이트 (필요 시)

**하네스 구조 설명** (10개 섹션):
1. 제품 비전 (1문장)
2. 현재 Sprint 상태
3. 결정론적 규칙
4. 절대 금지 사항
5. 산출물 규약
6. 의사결정 원칙
7. 위키 업데이트 규칙
8. 에이전트 작업 시퀀스
9. 위키 URL 구조
10. 변경 이력

**에피소드 페이지 템플릿** 제공:
- frontmatter (id, title, type, status, sessionIds, etc.)
- 목표, 변경 내역, 검증, 메모 섹션

**금지된 작업 패턴 감지**:
- 타입 우회 (`as any`, `@ts-ignore`)
- 빈 catch 블록
- `localStorage` 사용
- 배포 자동화

## 검증

- 파일 구조: `.opencode/opencode.jsonc`, `.opencode/skills/harness/SKILL.md` ✅
- 세션 인덱싱: `.omo/run-continuation/` 27개 세션 ✅
- 위키 스크립트: `wiki:index`, `wiki:dev`, `wiki:build` ✅

## 결정론적 보장

모든 세션에서:
- ✅ 동일한 HARNESS.md를 바라봄
- ✅ 동일한 스킬 라우팅 테이블을 참조
- ✅ 동일한 금지 패턴을 적용
- ✅ 동일한 산출물 규약을 따름
- ✅ 동일한 위키 구조를 유지

비결정적인 AI 행위가 최소화되고 결정론적인 품질이 보장됩니다.

## 메모 / 다음에 할 것

- 위키 인덱싱 자동화 스크립트 개선
- 세션 상태 저장소 동기화 고도화
- Linear/PR 연동 (Phase 2)
- Notion 통합 (Phase 2)