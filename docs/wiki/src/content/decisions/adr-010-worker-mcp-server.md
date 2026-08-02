---
id: adr-010
title: Worker MCP 서버 도입 — agents-sdk + McpAgent로 D1 데이터 read-only 노출
status: accepted
date: 2026-07-26
supersededBy: null
tags: [server, mcp, agent, deps, durable-objects, read-only]
---

# ADR-010: Worker MCP 서버 도입 — agents-sdk + McpAgent로 D1 데이터 read-only 노출

## Context

ADR-009에서 Cloudflare Worker를 MCP 서버로 전환하는 가능성을 열어두었다.
Phase 4에서 이를 실행한다. 목적: Sisyphus(AI agent)가 자연어로 스터디 운영
현황을 조회할 수 있도록, 기존 `studyops-server` Worker에 read-only MCP 인터페이스를 통합.

**요구사항**:
- 클라이언트: Sisyphus (내부 agent)
- 데이터 범위: read-only (스터디/회차/제출 현황 조회만)
- 위치: 기존 Worker에 `/mcp` 경로 통합 (별도 Worker 분리 X)
- 인증: Bearer token (`MCP_API_TOKEN` secret)

## Decision

**Cloudflare Agents SDK의 `McpAgent`를 사용해 Worker 내 MCP 서버를 구현한다.**

### 새 의존성 (HARNESS §4 rule 7 — ADR 필수)

| 패키지 | 용도 | 번들 영향 |
|---|---|---|
| `agents` | Cloudflare Agents SDK — `McpAgent`, `routeAgentRequest` | ~50KB gzip |
| `@modelcontextprotocol/sdk` | MCP 프로토콜 서버 구현체 (`McpServer`) | ~30KB gzip |
| `zod` | MCP tool 입력 스키마 검증 | ~10KB gzip (이미 shared에서 사용 중일 가능성) |

총 번들 증가: ~90KB gzip (현재 57.53KB → ~147KB 예상). Workers 업로드 제한 10MB에 여전히 여유.

### 아키텍처

```
Worker (studyops-server)
├── /mcp/*  → StudyOpsMcpAgent (Durable Object, McpAgent 상속)
│   ├── Bearer token auth (MCP_API_TOKEN)
│   ├── Streamable HTTP transport
│   └── Tools (read-only):
│       ├── list_studies() — 모든 스터디 (operator view)
│       ├── get_study({ studyId }) — 단일 스터디 상세
│       ├── list_rounds({ studyId }) — 스터디의 회차들
│       ├── get_round_status({ roundId }) — 제출률 + submitted/notSubmitted
│       └── list_low_submission_rounds() — 저제출 회차 (운영 대시보드)
│
├── /auth/* → authRoutes (기존)
├── /studies/* → studyRoutes (기존, JWT auth)
├── /rounds/* → roundRoutes (기존, JWT auth)
└── / → healthRoutes (기존)
```

### Durable Object 바인딩

MCP 세션 상태 관리를 위해 `STUDYOPS_MCP` DO 바인딩 추가.
State는 빈 객체 `{}` — read-only tool이라 세션 간 유지할 상태 없음.
`McpAgent`는 MCP 프로토콜의 stateful 세션 요구사항을 DO로 충족.

### 인증 전략

- `/mcp` 경로 진입 전 Bearer token 검증 (`MCP_API_TOKEN` env)
- OAuth provider 도입 X — 내부 Sisyphus 단일 클라이언트용이므로 과잉
- `boot-check.ts`가 prod 환경에서 `MCP_API_TOKEN` 존재 검증

### 데이터 범위 (중요)

MCP 도구는 **user-scoped가 아님** — operator/admin 관점에서 모든 스터디 조회.
기존 라우트의 `study.ownerId !== userKey → 403` 검사를 MCP에서는 적용하지 않음.
이유: Sisyphus는 운영자 보조 도구, 단일 사용자 컨텍스트가 아닌 시스템 전체 관점.

## Consequences

### 긍정
- Sisyphus가 "이번 주 제출률 낮은 회차 찾아줘" 같은 자연어 질의 가능
- D1 데이터를 안전하게 read-only로 노출 — 쓰기 작업은 기존 API(JWT auth)만 가능
- MCP 프로토콜 표준 준수 → Claude Desktop, 기타 MCP 클라이언트도 연결 가능 (향후)
- 기존 Hono API와 완전 분리 — MCP 장애가 앱 API에 영향 X

### 부정
- 번들 크기 90KB 증가 — Workers cold start 약간 느려질 수 있음
- DO 마이그레이션(v1) 추가 — 향후 DO 클래스 변경 시 새 마이그레이션 필요
- `MCP_API_TOKEN` secret 관리 부담

### 중립
- McpAgent 학습 곡선 — 하지만 기존 Cloudflare 스택 내 일관된 패턴
- DO 과금 — MCP 세션이 짧게 유지되면 무료 tier 내

## Alternatives Considered

### 별도 Worker (studyops-mcp) 분리
- **장점**: 관심사 분리, 독립 배포, 번들 분리
- **기각**: D1 바인딩 중복, 인증 로직 중복, 운영 복잡도 증가. MVP 단계에서 통합이 단순.

### Hono 라우트로 MCP 직접 구현 (SDK 없이)
- **장점**: 의존성 최소
- **기각**: MCP 프로토콜(JSON-RPC, 세션, 스트리밍) 직접 구현은 불필요한 복잡도

### GraphQL API 대신 MCP
- **장점**: 범용 쿼리 인터페이스
- **기각**: GraphQL 클라이언트 필요, MCP는 AI agent에 최적화

## Amendments

- **2026-08-03 — zod 단일 버전(v4) 통합 시도·연기**: 사전 감사가 잡은 "zod 이중 버전"을 제거하기 위해 시도.
  - `@modelcontextprotocol/sdk@1.29.0`(현재 핀)의 `.tool()` 타입은 `ZodRawShapeCompat` = zod **v3** `ZodType`에 바운드 → v4 스키마(`ZodString`/`ZodDefault`)가 타입 거부. peer dep는 `^3.25 || ^4.0`을 명시하지만 **타입 정의는 v3 전용**.
  - 최신 `1.30.0`으로 올리면 `agents@0.19.0`의 `McpAgent`와 private `_serverInfo` 충돌로 컴파일 실패 → 이것이 저장소가 1.29.0을 핀한 이유.
  - 결론: `zod3` npm alias는 **load-bearing**. v4 단일화는 `agents`와 `@modelcontextprotocol/sdk`가 함께 v4 타입을 지원하는 버전 쌍이 나올 때까지 연기. `as any` 우회는 코딩 컨벤션(§3.2)상 금지.

## References

- ADR-009 (MCP 통합 전략)
- Cloudflare Agents SDK MCP docs: https://developers.cloudflare.com/agents/api-reference/mcp-agent-api/
- MCP protocol spec: https://spec.modelcontextprotocol.io/
- HARNESS.md §3.3 (agents-sdk 스킬 라우팅), §4 rule 7 (새 의존성 ADR)
