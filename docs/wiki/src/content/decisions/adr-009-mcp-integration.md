---
id: adr-009
title: Cloudflare MCP + codegraph 기반 코드 인텔리전스 및 Agent-Worker MCP 게이트
status: accepted
date: 2026-07-26
supersededBy: null
tags: [infra, mcp, agent, codegraph, cloudflare-mcp, tooling]
---

# ADR-009: Cloudflare MCP + codegraph 기반 코드 인텔리전스 및 Agent-Worker MCP 게이트

## Context

프로젝트가 Phase 1 (환경 분리)과 Phase 2 (CI/CD)를 거치면서, Agent(Sisyphus)가
프로젝트 코드를 안전하게 수정하고 배포하기 위한 MCP 인프라가 필요했다.

작업자는 다음 정보에 접근해야 했다:
- 심볼/호출 그래프 (codegraph)
- 외부 라이브러리 문서 (context7)
- 브라우저 자동화 (playwright)
- Cloudflare Workers 배포/상태 (wrangler CLI)
- 이슈/PR 추적 (linear)

또한 Cloudflare Workers가 MCP 서버를 호스팅할 수 있다는 점을 활용하여,
Worker 내부의 D1 데이터를 MCP 프로토콜로 노출하거나 Agent가 Worker에 직접
RPC 호출을 할 수 있는 인프라 가능성이 열렸다.

## Decision

**MCP를 Agent의 도구 호출 게이트로 사용하고, Cloudflare Workers는 필요시 MCP 서버로도 운영한다.**

### 현재 활성 MCP (Phase 1-2)

| MCP | 용도 | 도입 시점 |
|---|---|---|
| `codegraph` | 심볼/레퍼런스 탐색, caller/callee 파악, 에디트 전 blast radius 확인 | Phase 1 |
| `context7` | 외부 라이브러리 API 문서 Lookup | Phase 1 |
| `playwright` | 브라우저 QA / 화면 검증 | Phase 1 |
| `linear` | 이슈/변경사항 추적 | Phase 1 |
| `notion` | 위키 문서 생성 및 업데이트 | Phase 1 |

### 미래 고려: Cloudflare Worker as MCP Server

Cloudflare Workers (Agents SDK)는 MCP 서버로 동작할 수 있다.
이를 통해:

1. **D1 데이터 → MCP 리소스**: `studyops-db-prod`의 특정 조회 결과를 MCP resource로 노출
2. **Agent → Worker RPC**: Agent가 Worker의 MCP tool을 호출하여 DB 조작, 스터디 생성 등 실행
3. **ChatGPT/AI 클라이언트 통합**: Worker의 로직을 MCP 프로토콜로 외부 AI에 공개

단, MVP 단계에서는 아직 도입하지 않는다. Worker MCP는 Phase 4+에서
실제 사용 사례(대시보드 조회, 운영 업무 자동화)가 명확해지면 검토.

### HARNESS §3.4 화이트리스트 확장

기존 HARNESS.md §3.4에 `notion` MCP를 추가한다.

## Consequences

### 긍정
- 모든 Agent의 Worker 관련 작업이 MCP 게이트를 통과 → 추적 가능
- codegraph 덕분에 심볼 수정 전 blast radius 파악 가능 → 사이드 이펙트 감소
- Cloudflare Worker MCP 서버로의 확장 경로 확보

### 부정
- MCP 의존성 — MCP 서버가 다운되면 Agent의 일부 기능 제한
- codegraph가 아직 인덱싱하지 않은 파일은 raw read 필요 (config, 문서 등)

### 중립
- Worker를 MCP 서버로 전환하는 것은 기존 fetch handler와 공존 가능 (경로 분기)
- Agents SDK의 `createMcpHandler()`가 Worker fetch와 MCP를 동시 처리

## Alternatives Considered

### Worker 전용 SDK/MCP 없이 wrangler CLI만 사용
- **장점**: 단순함, 추가 인프라 불필요
- **유지**: Phase 3까지는 이 방식을 유지. `wrangler deploy` / `wrangler d1`을 터미널에서 직접 실행
- **향후 전환**: Agent가 `wrangler` CLI 출력을 파싱하는 대신 MCP tool로 직접 D1에 질의

### 모든 MCP를 하나의 Worker로 통합
- **장점**: 단일 엔드포인트
- **기각**: codegraph는 로컬 SQLite 기반이라 Worker에 배포 불가. 각 MCP의 성격이 다름

## References

- `HARNESS.md` §3.4 (MCP 화이트리스트)
- Cloudflare MCP Server docs: https://developers.cloudflare.com/workers/demos/chatgpt-app/
- Agents SDK: `createMcpHandler()` from `agents/mcp`
- codegraph: `codegraph_explore` / `codegraph_node` / `codegraph_callers`
