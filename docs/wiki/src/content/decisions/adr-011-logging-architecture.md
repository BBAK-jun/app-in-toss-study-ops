---
id: adr-011
title: 로깅 아키텍처 — 3계층 로깅 + D1 영속화 + 클라이언트 오프라인 큐
status: accepted
date: 2026-07-26
supersededBy: null
tags: [server, client, observability, d1, indexeddb, sampling, pii]
---

# ADR-011: 로깅 아키텍처 — 3계층 로깅 + D1 영속화 + 클라이언트 오프라인 큐

## Context

ADR-010까지의 인프라에서 Worker 로깅은 `console.error(JSON.stringify(...))` 형태로
이미 구조화되어 있었으나, 다음이 부족했다:

- **보관**: Workers Logs(3일) 만료 후 로그 소멸. 장애 회귀 분석 불가.
- **쿼리**: 필터/검색/통계 UI 없음. `wrangler tail` 은 실시간 전용.
- **클라이언트 가시성**: 프론트 에러/UX 이벤트 수집 경로 없음.
- **PII 통제**: 사용자 식별자 무통과 로깅 위험.
- **운영 예산**: $0/월 예산 내에서 풀스택 observability 필요.

목표: **Cloudflare Workers + D1 무료 tier 내에서** 서버/클라이언트 양쪽 로그를
수집·영속화·대시보드 조회할 수 있는 자체 로깅 인프라 구축.

## Decision

3계층 로깅 파이프라인을 도입한다.

```
Tier 1 (Hot)   Workers Logs (내장, 무료, 3일)
Tier 2 (Warm)  D1 logs 테이블 (자체 관리, 레벨별 7~365일)
Tier 3 (Dash)  /admin/logs 대시보드 페이지
```

### 1. 로그 레벨 매트릭스 (샘플링 + 보관)

| Level   | 정의                         | prod 샘플링 | D1 보관 | Discord |
|---------|------------------------------|-------------|---------|---------|
| debug   | 개발 디버깅. prod 끔          | 0%          | 7일     | X       |
| info    | 정상 운영 이벤트              | 10%         | 30일    | X       |
| warn    | 예상치 못한 정상 동작          | 100%        | 90일    | X       |
| error   | 오류. 자동 복구됨              | 100%        | 90일    | O       |
| fatal   | 서비스 중단. 사람 개입 필요     | 100%        | 365일   | O       |

- `forceSample=true` 플래그로 비즈니스 중요 이벤트(`study.created`,
  `submission.created` 등)는 샘플링 무시.
- 샘플링 결정은 hash-based deterministic — 같은 엔트리는 같은 fate.

### 2. 수집 이벤트 카탈로그 (event 필드 컨벤션: `domain.action`)

**auth.\*** — login.start/success/failed, token.refresh, session.expired,
forbidden, rate_limited

**study.\* / round.\* / submission.\*** — 비즈니스 도메인 CRUD + 알림 결과

**infra.\*** — worker.boot, boot_check.failed, db.query.slow(>200ms), db.error,
migration.applied/failed, cron.completed

**client.\*** — page.view, error.unhandled, error.promise, error.boundary,
api.timeout, api.error, render.slow, session.start/end

**mcp.\*** — tool.invoked, tool.error (ADR-010 연계)

전체 카탈로그는 `packages/shared/src/logs.ts`의 `LOG_EVENTS` const에서 관리.
새 이벤트는 이 const에 추가 → 타입 체커가 미확인 이벤트 차단.

### 3. PII 스크러빙 규칙

- **user_id**: 평문 저장 (DB FK). 대시보드 조인 가능.
- **이메일/전화번호**: SHA-256(salt + value) 해시. 평문 금지.
- **액세스 토큰 / mTLS 키**: 절대 로깅 금지. 객체 통째로 skip.
- **요청 바디**: 화이트리스트 필드만. 나머지 `[REDACTED]`.
- **IP**: 첫 octet + 해시 (예: `203.0.x.x / hash:abc`).
- **Discord webhook URL**: 호스트만 (`https://discord.com/api/webhooks/***`).

화이트리스트 방식 — 블랙리스트보다 누락 위험 적음.
`apps/server/src/lib/logger.ts::sanitizeContext()` 에서 단일 통로로 처리.

### 4. 서버사이드 로거 (Tier 1+2 동시)

`lib/logger.ts` — 요청 컨텍스트(`c.var`)를 주입받는 함수형 로거.

```
log(ctx, entry)
  ├─ console.log(JSON.stringify(entry))    # Tier 1: Workers Logs
  ├─ if (shouldSample(entry))
  │    ctx.waitUntil(dbInsert(entry))      # Tier 2: D1 batch
  └─ if (entry.level >= error)
       ctx.waitUntil(discordNotify(entry)) # 기존 webhook 재사용
```

- **배치 INSERT**: 단일 INSERT에 여러 row (multi-row values)
- **`ctx.waitUntil`**: 로깅이 응답을 블록하지 않음
- **D1 실패 → Tier 1 폴백**: `console.error`는 이미 찍혔으므로 손실 없음

### 5. 미들웨어: 요청 추적

`middleware/logging.ts` — 모든 요청에:

- `request_id` 생성 (`crypto.randomUUID()`) → `c.set('requestId', ...)`
  및 응답 헤더 `X-Request-Id`
- 시작 시간 기록 → 응답 후 `duration_ms` 계산
- `path`, `method`, `status` 자동 캡처
- 4xx → `warn`, 5xx → `error` 자동 로깅

### 6. 클라이언트 로거 (오프라인 큐 + 백오프)

IndexedDB 기반 persistent queue. WebView 환경에서 localStorage는
세션만 허용(Toss 정책)하므로 IndexedDB 선택.

```
[log call] → In-memory buffer (50 max)
              ↓ flush trigger
              ① buffer 50 도달
              ② 5초 타이머
              ③ error 레벨 즉시
              ④ pagehide (sendBeacon)
              ↓
            Retry Queue (IndexedDB 'pending-logs')
              ↓ POST /api/logs (batch)
            성공 → ack (DB에서 제거)
            실패 → 백오프 재시도
```

**백오프**: full-jitter exponential (1s/2s/4s/8s/16s/30s/60s, 7회 시도).
트리거: timer / `online` event / `visibilitychange` / `pagehide`.

**용량 한도**:
- IndexedDB pending: 1000 entries (초과시 오래된 것부터 drop)
- 7일 경과 미전송 → 폐기 (dead-letter 보존 50개)

### 7. 대시보드 (Tier 3)

`/admin/logs` 페이지 (관리자 전용, 현재는 인증된 사용자 모두 접근 —
RBAC는 별도 ADR에서 다룸). 기능:

- 필터: level, source, event, time range, 검색어
- 페이지네이션 (50/page)
- 상세 모달: context JSON, stacktrace
- 자동 새로고침 (10s, opt-in)

API: `GET /api/admin/logs?level=&event=&...&cursor=` (cursor-based pagination)

### 8. 보존 정책 (Cron)

`/__cron` 엔드포인트 (Worker scheduled handler):
- 매일 04:00 KST 실행
- 레벨별 보관기간 초과 로그 `DELETE FROM logs WHERE ts < ?`
- D1 용량 관리

### 9. Rate Limiting (클라이언트 로그 수신)

`POST /api/logs`:
- 인증된 사용자: 60 req/min/userKey
- 익명: 10 req/min/ip
- 초과시 429 (드랍하지 않고 rate limit 자체도 `warn` 로깅)

## Consequences

### 긍정

- **$0 비용**: D1 무료 tier (5GB, 100k writes/day) + Workers Logs + Analytics Engine
- **완전한 통제**: 데이터 주권, 쿼리, 보존 정책 100% 자체 관리
- **PII 안전**: 화이트리스트 스크러빙으로 규정 대응
- **오프라인 견고**: 클라이언트 IndexedDB 큐로 네트워크 장애 견딤
- **점진적 도입**: 기존 `console.error(JSON.stringify(...))` 코드와 호환 —
  Tier 1은 그대로 동작, Tier 2가 추가되는 형태

### 부정

- **D1 write 한도 (100k/day)**: 트래픽 급증시 샘플링으로만 대응.
  하루 1000명 활성 사용자 × 10 info events × 10% = 1k → 여유.
  하지만 debug 레벨을 prod에서 켜면 즉시 한도 도달.
- **대시보드 보안**: 현재 RBAC 없음. 인증된 사용자면 누구나 admin 접근 가능.
  → 사내 도구이므로 현 단계에선 허용, 외부 노출 시 반드시 RBAC 추가.
- **클라이언트 큐 용량**: IndexedDB 정리 안 되는 디바이스에서 용량 점유.
  7일 만료 + 1000 entry cap으로 완화.
- **운영 복잡도**: 보존 cron, 마이그레이션, 대시보드 코드 자체 관리 부담.

### 중립

- Workers Logs의 3일 보관은 여전히 1차 디버깅 도구. D1은 심층 분석/감사용.
- Analytics Engine는 메트릭 전용으로 별도 도입 가능 (이번 범위 X).

## Alternatives Considered

### A. 외부 SaaS (Sentry + Axiom + Logflare)
- **장점**: 즉시 사용, 풍부한 UI, 전문가 도구
- **기각**: 예산 $0 제약. 사용자 결정에 따라 자체 구축 선택.

### B. Workers Logpush → R2 + Athena 쿼리
- **장점**: 서버 코드 최소, 자동 영속화
- **기각**: Workers Paid($5/mo) 필요 + R2/Athena 쿼리 비용. 무료 tier 초과.

### C. D1에 모든 로그 저장 (샘플링 X)
- **장점**: 단순, 완전한 데이터
- **기각**: 100k writes/day 한도 즉시 도달. 샘플링 필수.

### D. localStorage 사용 (IndexedDB 대신)
- **장점**: API 단순
- **기각**: 동기식 블록, 5MB 제한, Toss 정책상 클라이언트 localStorage 제한.

## New Dependencies

| 패키지      | 용도                     | 번들 영향 |
|-------------|--------------------------|-----------|
| `idb-keyval`| 클라이언트 IndexedDB 래퍼 | ~1KB gzip |

서버는 신규 의존성 없음 (이미 Hono + Drizzle + Zod 사용 중).

## References

- ADR-006 (env 분리 — dev/prod 로깅 분기 기반)
- ADR-007 (D1 dev/prod 격리 — 로그 DB 동일 패턴 적용)
- ADR-008 (CI/배포 게이트 — 로깅 코드 회귀 방지)
- ADR-010 (MCP — `mcp.*` 이벤트 소스)
- Cloudflare D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- AWS Exponential Backoff with Jitter: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- Toss WebView storage policy (앱인토스 docs)
