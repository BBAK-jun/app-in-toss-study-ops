---
id: adr-004
title: 하네스 환경 도입 — HARNESS.md 실행 컨텍스트 계약서 + Astro 정적 위키
status: accepted
date: 2026-07-26
supersededBy: null
tags: [harness, wiki, astro, developer-experience, ai-agent, docusaurus]
---

# ADR-004: 하네스 환경 도입 — HARNESS.md + Astro 정적 위키

## Context

MVP 1차 sprint 이후 관찰된 문제:

1. **AI 에이전트의 비결정성**: Sisyphus/Codex가 매 세션 다른 해석으로 산출물 품질이 흔들림. 같은 기능을 구현해도 스킬 선택, 스택 준수 여부, 산출물 형식이 매번 다름.
2. **작업 히스토리 분실**: `.omo/run-continuation/` 세션 9개, QA 스크린샷 8개, OD mockup 산출물들이 구조화되지 않은 채 흩어져 있음. "지난번에 이거 어떻게 했더라"를 찾기 어려움.
3. **결정 맥락 부재**: ARCHITECTURE.md에 설명은 있지만, "왜 이 선택을 했는가"에 대한 결정 근거(ADR)가 코드와 분리되지 않음.
4. **진행 상황 가시성 부족**: 어디까지 됐는지, 무엇이 남았는지, 어떤 리스크가 있는지를 한눈에 보기 어려움.

목표: AI 행위를 통제하면서, 작업 진행을 데이터로 볼 수 있는 시스템을 구축하되, 8/5 데모 일정을 위협하지 않는 범위에서 **얇은 하네스**를 유지.

## Decision

### 1. HARNESS.md (루트) — 실행 컨텍스트 계약서

AI 에이전트가 저장소 작업 시 반드시 먼저 읽는 규약 문서. PRD/ARCHITECTURE를 대체하지 않고 그 위에서 작동. 10개 섹션:

1. 제품 비전 (1문장)
2. 현재 Sprint 상태 (동적)
3. 결정론적 규칙 (스택 고정, 코딩 컨벤션, 스킬 라우팅, MCP 화이트리스트)
4. 절대 금지 사항
5. 산출물 규약 (매 작업 후 남길 것)
6. 의사결정 원칙
7. 위키 업데이트 규칙
8. 에이전트 작업 시퀀스
9. 위키 URL 구조
10. 변경 이력

### 2. docs/wiki/ — Astro 정적 사이트

Astro v5 Content Layer API + Zod 스키마로 5개 콘텐츠 컬렉션을 정의:

- **episodes** — 작업 단위 (한 sprint/이슈 = 한 페이지)
- **decisions** — ADR (이 문서 시리즈)
- **qa** — QA 세션 (스크린샷 + 메타데이터)
- **sessions** — `.omo/run-continuation/` 자동 인덱스
- **changelog** — 외부 연동 캐시 (Phase 2)

데이터는 마크다운 + YAML frontmatter로 저장. 부가 데이터는 sidecar JSON. 빌드 결과는 정적 HTML로 Cloudflare Pages에 무료 배포 가능.

### 3. 인덱싱 자동화

`scripts/index-local.ts` (tsx로 실행)가 멱등으로 동작:
- `.omo/run-continuation/*.json` → `src/content/sessions/*.md`
- 루트 `qa-*.png`, `screen-*.png` → `public/qa/legacy/` 복사 + qa 컬렉션 메타데이터 생성

## Consequences

### 긍정
- AI 산출물 품질 편차 감소 — HARNESS.md가 매 세션 동일한 출발점 제공
- 작업 히스토리 인덱싱 — 잊혀진 결정, QA 결과, 세션 맥락을 검색 가능
- sprint 가시성 — 대시보드에서 진행/완료/블로커를 한눈에
- 외부 연동 준비 — Phase 2에서 Linear/GitHub/Discord를 같은 스키마로 확장 가능
- 정적 사이트 → 배포 비용 0원 (Cloudflare Pages 무료 tier)

### 부정
- 위키 작성 부담 — 매 작업 후 에피소드 페이지를 써야 함
- HARNESS.md 유지보수 — sprint 전환 시 §2 업데이트 필요
- 학습 곡선 — Astro Content Layer API (v5 변경분)에 대한 이해 필요
- 인덱싱 스크립트 의존 — 스크립트가 깨지면 자동 수집이 안 됨

### 완화
- HARNESS.md §5 (산출물 규약)에 에피소드 템플릿을 제공하여 작성 부담 최소
- 인덱싱 스크립트는 멱등 + 에러 복구 (파싱 실패 시 건너뜀)
- HARNESS.md 업데이트를 잊으면 AI가 작업 시퀀스에서 강제 (§8)

## Alternatives Considered

### Docusaurus / MkDocs Material
- **장점**: 문서 사이트에 특화, 검색/버저닝 내장
- **단점**: Docusaurus는 React 기반으로 무거움, MkDocs는 Python 의존성. 모두 콘텐츠 컬렉션 스키마 검증이 약함 (YAML frontmatter 자유도 너무 높음 → 결국 타입 안전성 부족)
- **기auction 이유**: Astro Content Layer API의 Zod 스키마가 "잘못된 메타데이터"를 빌드 시점에 잡아주는 것이 결정적 이점. AI가 작성한 에피소드의 frontmatter 오류를 자동 검증 가능.

### Obsidian 볼트 (로컬 마크다운)
- **장점**: 빌드 단계 없음, wikilinks 자유로움
- **단점**: 외부 공유 불가, "데이터로 본다"는 요구(쿼리/필터/통계)를 만족시키기 어려움
- **기각 이유**: 위키 산출물을 8/5 데모에서 링크 공유하려면 정적 사이트가 필요.

### 데이터베이스 + 대시보드 (React)
- **장점**: 동적 쿼리, 풍부한 UI
- **단점**: 구축/유지비용 큼, 데이터베이스 의존성 추가, 정적 사이트 대비 복잡도 5배 이상
- **기각 이유**: MVP 검증 단계에서 오버스펙. 차후 StudyOps Bot 자체 기능으로 발전시킬 비전이 있다면 재검토.

## Implementation Phases

| Phase | 범위 | 상태 |
|---|---|---|
| **Phase 1** | HARNESS.md + Astro 위키 기본 구조 + 로컬 데이터 인덱싱 | ✅ 진행 중 (이 에피소드) |
| **Phase 2** | Linear 동기화, GitHub PR 인덱싱, Discord 캡처 | ⏸ 8/5 데모 이후 |
| **Phase 3** | npm 스크립트 통합, pre-commit hook, Cloudflare Pages 자동 배포 | ⏸ Phase 2 이후 |

## References

- `HARNESS.md` (루트) — 이 결정의 산물
- `docs/wiki/src/content.config.ts` — 5개 컬렉션 Zod 스키마
- `docs/wiki/scripts/index-local.ts` — 인덱싱 스크립트
- `docs/wiki/src/content/episodes/2026-07-26-harness-setup.md` — 구축 에피소드
- Astro Content Collections: https://docs.astro.build/en/guides/content-collections/
