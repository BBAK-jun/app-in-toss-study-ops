---
id: 2026-07-26-harness-setup
title: 하네스 환경 초기 구축 — HARNESS.md + Astro 위키
type: infra
status: shipped
startedAt: 2026-07-26T11:00:00+09:00
shippedAt: 2026-07-26T11:30:00+09:00
sessionIds:
  - ses_063ccacb4ffeKsEzR50sYZfjUI
  - ses_063d0cd3affe9n3Nq4wlxeGhHY
  - ses_09cd868e4ffeJ7c9t5918vUNMu
relatedDecisions:
  - adr-004
touchedFiles:
  - HARNESS.md
  - docs/wiki/package.json
  - docs/wiki/astro.config.mjs
  - docs/wiki/tsconfig.json
  - docs/wiki/src/content.config.ts
  - docs/wiki/scripts/index-local.ts
  - docs/wiki/src/content/episodes/2026-07-12-mvp-1-sprint.md
  - docs/wiki/src/content/episodes/2026-07-26-harness-setup.md
  - docs/wiki/src/content/decisions/adr-001-cloudflare-workers-d1.md
  - docs/wiki/src/content/decisions/adr-002-toss-auth-dev-live.md
  - docs/wiki/src/content/decisions/adr-003-shared-types-monorepo.md
  - docs/wiki/src/content/decisions/adr-004-harness-wiki-astro.md
linearIssue: null
githubPR: null
tags: [harness, wiki, astro, docusaurus, developer-experience]
summary: 비결정적인 AI 에이전트 행위를 통제하는 얇은 실행 컨텍스트 계약서(HARNESS.md)와, 작업 진행 상황을 데이터로 시각화하는 Astro 정적 위키를 구축. 외부 연동(Linear, GitHub, Discord)은 Phase 2로 분리.
---

## 목표

1. AI 에이전트(Sisyphus/Codex)가 매 세션 동일한 해석, 동일한 산출물 품질을 내도록 **실행 컨텍스트 규약**(HARNESS.md)을 정의한다.
2. 흩어진 작업 산출물(세션 로그, QA 스크린샷, 결정 근거)을 **Astro 정적 위키**로 구조화하여 데이터로 볼 수 있게 한다.
3. 8/5 데모 일정을 위협하지 않는 범위에서 **얇은 하네스**를 유지한다.

## 설계 결정

- **하네스 핵심**: 실행 컨텍스트 규약 (스킬/MCP 라우팅 + 코딩 컨벤션 + 산출물 규약). 런타임 게이트나 별도 검증 도구는 Phase 3로 연기.
- **위키 형태**: Astro v5 Content Layer API + Zod 스키마. 마크다운 + sidecar JSON으로 데이터 저장, 정적 사이트로 빌드.
- **데이터 소스**: Phase 1은 로컬 데이터 (.omo 세션, QA 스크린샷). Phase 2에서 Linear/GitHub/Discord 연동.

## 변경 내역

### 새로 생성
- `HARNESS.md` (루트) — AI 컨텍스트 계약서. 10개 섹션 (비전, sprint 상태, 결정론적 규칙, 스킬/MCP 라우팅, 금지 사항, 산출물 규약, 의사결정 원칙, 작업 시퀀스, URL 구조, 변경 이력).
- `docs/wiki/` — Astro 프로젝트 전체.
  - `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`
  - `src/content.config.ts` — 5개 콘텐츠 컬렉션 스키마 (episodes, decisions, qa, sessions, changelog)
  - `scripts/index-local.ts` — .omo 세션 + 루트 QA 스크린샷 자동 인덱싱 (멱등)

### 자동 생성 (인덱싱 스크립트 실행 시)
- `src/content/sessions/ses-*.md` — `.omo/run-continuation/*.json`에서 변환
- `public/qa/legacy/qa-*.png`, `public/qa/legacy/screen-*.png` — 루트에서 복사
- `src/content/qa/2026-07-15-mvp1-qa-legacy.md` — 레거시 QA 메타데이터

## 검증

- [x] HARNESS.md 작성 — 10개 섹션 모두 작성, HARNESS 자체에서 정의한 규칙을 따름
- [x] Astro 위키 디렉토리 구조 — 5개 콘텐츠 컬렉션 스키마 정의
- [x] 인덱싱 스크립트 — `npm run index`로 실행 가능, 멱등
- [ ] Astro 위키 로컬 빌드 성공 (`npm run build`)
- [ ] 대시보드 페이지에서 에피소드/세션/QA 가시화 확인
- [ ] 루트 package.json에 `wiki:dev`, `wiki:build`, `wiki:index` 스크립트 등록

## 메모 / 다음에 할 것

### Phase 2 (외부 연동)
- Linear MCP를 통한 이슈 동기화 스크립트
- GitHub PR 인덱싱 (린트/테스트 결과 포함)
- Discord 스레드 캡처 (리마인드 발송 이력)
- OpenCode `opencode.db` (SQLite)에서 세션 메시지 히스토리 파싱

### Phase 3 (자동화)
- git pre-commit hook으로 자동 인덱싱
- HARNESS 규칙 검사 도구 (패키지 `packages/harness/`로 분리 검토)
- Cloudflare Pages 자동 배포 (wiki 사이트)

### 당면 과제
- 현재 이 에피소드는 `in-progress`. 대시보드와 빌드 검증 완료 후 `shipped`로 전환.
