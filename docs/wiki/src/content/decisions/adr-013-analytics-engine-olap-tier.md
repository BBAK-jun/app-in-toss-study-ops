---
id: adr-013
title: Analytics Engine 도입 — D1 + AE 이중 적재 (메트릭/상세 역할 분리)
status: accepted
date: 2026-07-27
supersededBy: null
tags: [server, observability, analytics-engine, olap, d1, dual-write, product-analytics]
---

# ADR-013: Analytics Engine 도입 — D1 + AE 이중 적재 (메트릭/상세 역할 분리)

## Context

ADR-011의 3계층 로깅 파이프라인은 D1 단일 테이블(`logs`)에 영속 로그를 보관한다.
이 설계는 $0 예산 내에서 잘 동작하지만, **근본적 한계**가 드러나기 시작했다:

1. **Row-store vs OLAP 워크로드 불일치**
   - `logs` 테이블은 SQLite(D1)의 B-tree row-store. 18개 컬럼을 디스크에서 row 단위로 읽음.
   - 대시보드 집계 쿼리(`SELECT level, COUNT(*) ... GROUP BY level`)는 `level` 컬럼만 필요한데
     `message`, `context`, `stack`까지 전부 읽어야 함 → **scan amplification ~18배**.

2. **샘플링으로 인한 집계 부정확성**
   - D1 무료 tier 100k writes/day 한도 때문에 info 레벨은 10% 샘플링.
   - "지난주 error rate 추이" 같은 집계 쿼리가 10% 샘플 기반이라 통계적 오차 큼.
   - 비즈니스 중요 이벤트(`study.created`)는 `forceSample`으로 우회하지만,
     일반 info 이벤트(`auth.token.refresh`)는 누락 가능.

3. **시계열 쿼리 비효율**
   - "최근 1시간 error 발생 횟수 by event" 쿼리가 컬럼 스토어 기반이라면 밀리초 단위인데,
     D1에서는 풀스캔에 가까운 비용.
   - repo 이름이 `log-olap`임에도 진짜 OLAP 엔진이 없음.

4. **`message LIKE '%search%'` 풀스캔**
   - 이미 ADR-011 분석에서 지적. FTS5로 완화 가능하지만 row-store 근본 한계는 그대로.

대안 평가 결과, **Cloudflare Workers Analytics Engine(AE)**이 위 한계를 가장 낮은 비용과
마이그레이션 부담으로 해결할 수 있는 것으로 확인됨.

## Decision

**Workers Analytics Engine을 D1과 병행 적재하는 "메트릭 전용 계층"으로 추가한다.
역할을 명시적으로 분리한다:**

```
log() call (서버)
  ├─ Tier 1: console.log                         → Workers Logs (3일, 무료, 변경 없음)
  ├─ Tier 2 (NEW): env.LOGS_ANALYTICS.writeDataPoint  → AE (항상, 메트릭/집계용)
  │                                                  ↳ non-blocking, 샘플링 없음
  ├─ Tier 3: ctx.waitUntil(insertLog)             → D1 (기존, 샘플링 유지, 상세/검색용)
  └─ Tier 4: error/fatal → Discord webhook (기존)
```

### 1. 역할 분담 매트릭스

| 작업 | AE 적합 | D1 적합 | 비고 |
|---|:---:|:---:|---|
| "최근 1시간 error 발생 횟수 by event" | ✅ | ❌ | AE: `SUM(_sample_interval) GROUP BY blob` |
| "일별 error rate 추이 (30일)" | ✅ | ⚠️ | AE: time bucket + ratio 계산 |
| "TOP 10 events by count (이번 주)" | ✅ | ⚠️ | AE가 수백 배 빠름 |
| "지난 7일 p95 응답 시간 by path" | ✅ | ❌ | AE `PERCENTILE` (D1은 불가) |
| "이 사용자 최근 로그 50개 row" | ❌ | ✅ | AE는 raw row 보관 안 함 |
| "message에 'timeout' 포함된 로그 검색" | ❌ | ✅ | AE는 LIKE/전문검색 미지원 |
| "request_id X의 추적 (row 단위)" | ❌ | ✅ | 동일 |
| 상세 context JSON / stacktrace 보기 | ❌ | ✅ | AE blob 크기·형식 제약 |
| 보관 기간 | **3개월 고정** | 레벨별 7~365일 | 보완적 |

→ **AE는 "얼마나"를 담당, D1은 "무엇을"을 담당.**

### 2. AE 데이터 포인트 매핑

AE 제약: **1 index + 20 blobs + 20 doubles**. 로그 18개 컬럼을 이 안에 압축.

| LogEntry 필드 | AE 매핑 | 타입 | 카디널리티 |
|---|---|---|---|
| (자동) | `timestamp` | (AE 내장) | — |
| `event` | **`index1`** | index | 중간 (~40종) — equitable sampling 키 |
| `level` | blob1 | string | 5종 (debug/info/warn/error/fatal) |
| `source` | blob2 | string | 4종 (client/server/cron/mcp) |
| `env` | blob3 | string | 2종 (dev/production) |
| `path` | blob4 | string | 중간 (~수십) |
| `method` | blob5 | string | 5종 |
| `status` (문자열) | blob6 | string | ~30종 |
| `userId` (문자열) | blob7 | string | **고카디널리티** ⚠️ |
| `LOG_LEVEL_WEIGHT[level]` | double1 | number | numeric filter용 |
| `durationMs` | double2 | number | 핵심 메트릭 |
| `status` (숫자) | double3 | number | avg/percentile용 |
| `1` (count weight) | double4 | number | `SUM(_sample_interval * 1)` = 보정된 count |

**생략되는 필드** (D1에만 보관): `sessionId`, `requestId`, `context`, `stack`,
`message`, `version`, `userAgent`, `ipHash`. 이들은 row 단위 조회/검색용이지
집계 대상이 아님.

#### index1 선택 근거

`event`를 샘플링 키로 쓰는 이유: AE의 **equitable sampling**은 "각 index 값마다
저장되는 데이터 포인트 수를 평준화"한다. 즉 빈번한 이벤트(`auth.token.refresh`)는
샘플링되고, 희귀 이벤트(`infra.migration.failed`)는 100% 보존된다.
**장애 분석에 유리한 기본 동작**.

대안 후보: `source`(4종, 너무 극단적 평준화), `env`(2종, 부적합).

#### 고카디널리티 blob 주의

`userId`(blob7)는 사용자별 집계를 위해 넣지만, 고카디널리티가 equitable sampling
동작에 영향을 줄 수 있음. 초기 도입 시 데이터 점검 후 필요하면 `userId`를 blob에서
빼고 별도 AE dataset(`studyops_logs_users`)으로 분리하는 옵션 검토.

### 3. Worker binding (`wrangler.jsonc`)

최상위 + `env.production` 양쪽에 추가. dev/prod 격리는 ADR-007 D1 패턴과 동일하게
**dataset 이름으로 분리** (`studyops_logs_dev` vs `studyops_logs_prod`).
dataset은 첫 write 시 자동 생성되므로 별도 생성 명령 불필요 (공식 문서 확인됨).

```jsonc
"analytics_engine_datasets": [
  {
    "binding": "LOGS_ANALYTICS",
    "dataset": "studyops_logs_dev"
  }
]
```

### 4. Adapter 모듈 (`apps/server/src/lib/analytics.ts`)

```ts
// AE 바인딩 래퍼. logger.ts에서 호출.
// AE write는 non-blocking이므로 waitUntil 불필요 (공식 문서 확인됨).

import { LOG_LEVEL_WEIGHT, type LogEntry } from '@studyops/shared';

export function writeLogDataPoint(
  analytics: AnalyticsEngineDataset,
  entry: LogEntry,
): void {
  analytics.writeDataPoint({
    blobs: [
      entry.level,
      entry.source,
      entry.env ?? 'dev',
      entry.path ?? '',
      entry.method ?? '',
      String(entry.status ?? ''),
      entry.userId != null ? String(entry.userId) : '',
      // blob8~20 예약 (향후 메트릭 추가 시)
    ],
    doubles: [
      LOG_LEVEL_WEIGHT[entry.level],
      entry.durationMs ?? 0,
      entry.status ?? 0,
      1,  // count weight — `SUM(_sample_interval)`로 보정
    ],
    indexes: [entry.event],
  });
}
```

### 5. `logger.ts` 변경 포인트

`logWithContext()`에 AE write 1줄 추가 (Tier 2). 샘플링 의사결정에서 AE는 **제외** —
AE는 항상 100% 적재.

```ts
// Tier 2 (NEW): AE — 항상. 샘플링 없음.
if (ctx.analytics) {
  try {
    writeLogDataPoint(ctx.analytics, entry);
  } catch {
    // AE 실패는 무시 — D1 + Tier 1이 있음.
  }
}

// Tier 3 (기존): D1 — 샘플링 통과시.
if (shouldSample(entry, ctx.env)) {
  ctx.executionCtx.waitUntil(insertLog(ctx.db, entry).catch(...));
}
```

`LogContext` 인터페이스에 `analytics?: AnalyticsEngineDataset` 추가.

### 6. 클라이언트 로그 라우트 영향

`POST /logs`의 `insertLogBatch` 호출 전에, batch의 각 entry에 대해 AE write도 수행.
AE 런타임은 `writeDataPoint` (단수형)만 지원하므로, 어댑터에서 내부 루프로 배치 처리
(단일 Worker invocation 내 250 data points 제한 안에서 100-entry batch 안전).

### 7. Dashboard SQL 쿼리 엔드포인트

새 route `GET /api/admin/logs/metrics?type=...`. Worker 내부에서 AE SQL API 호출.

```ts
// apps/server/src/routes/admin/logs-metrics.ts (신규)
const sql = `
  SELECT blob1 AS level, SUM(_sample_interval) AS count
  FROM studyops_logs
  WHERE timestamp > NOW() - INTERVAL '1' HOUR
    AND blob3 = 'production'
  GROUP BY level
  ORDER BY count DESC
`;

const res = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${c.env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: sql,
  },
);
```

지원 메트릭:
- `error_rate` — 최근 N시간 error/(error+info+warn) 비율 by event
- `top_events` — 기간 내 count 기준 TOP N events
- `p95_duration` — path별 duration 백분위수
- `timeseries` — 일별 레벨별 로그 발생 추이 (chart용)

### 8. 인증

AE SQL API 호출은 Cloudflare 계정 API 토큰(`CF_API_TOKEN` secret) 필요.
대시보드 엔드포인트 자체는 기존 `authMiddleware` 통과 (ADR-011 RBAC 한계 승계).

### 9. 보존 정책

- **AE**: 3개월 고정 (설정 불가). 시계열 트렌드 분석은 3개월 창 내에서.
- **D1**: ADR-011의 레벨별 보관 유지 (debug 7일 ~ fatal 365일).
- **장기 보관/전수 분석**: [ADR-014](./adr-014-r2-parquet-archiving.md) R2 + Parquet 파이프라인.

### 10. 제품 분석 인프라로의 확장 (Product Analytics)

AE 도입은 시스템 로그 집계(Tier 2) 목적을 넘어, **제품 분석(Product Analytics)
인프라의 기반**이 된다. 기존 `LOG_EVENTS` 카탈로그의 `client.*` / `study.*` /
`submission.*` 이벤트가 이미 product analytics 용도로 설계되어 있어, 본 ADR 도입과
동시에 추가 비용/인프라 없이 다음이 가능해진다.

#### 즉시 확보되는 제품 지표

| 지표 | 쿼리 패턴 | 이벤트 |
|---|---|---|
| DAU/MAU, sticky factor | `COUNT(DISTINCT blob7)` by day/month | `client.session.start` |
| 페이지뷰 / 세션 수 | `SUM(_sample_interval) GROUP BY blob4(path)` | `client.page.view` |
| 비즈니스 KPI 추이 | 일별 `study.created`, `submission.created` count | `study.*`, `submission.*` |
| 회차당 제출률 | `submission.created` / `round.reminder.sent` 비율 | 두 event count |
| UX 응답 성능 p95/p99 | `PERCENTILE(double2, 0.95) GROUP BY path` | `client.render.slow` |
| 디바이스/국가별 분포 | `GROUP BY blob` (userAgent parsed, cf-connecting-country) | 모든 client.* |

#### 추후 확장 (별도 코드 추가)

- **A/B 테스트 결과 집계** — 실험 variant ID를 blob에 추가 → 그룹별 메트릭 비교
- **기능 사용률** — 버튼 클릭 이벤트(`client.button.click`) 추가 → feature adoption 측정
- **활성 사용자 랭킹** — userId blob GROUP BY + count 정렬

#### AE 단독으로는 불가능한 고급 분석 (후속 ADR 필요)

- **퍼널 분석** (로그인 → 스터디 생성 → 제출까지 전환율) — AE는 JOIN 미지원
- **코호트 리텐션** (가입주차별 N주차 활성률) — sequence 작업, AE는 시점별 count만
- **패스 분석 / 세션 재구성** — row 단위 시퀀스 복원 필요 → D1 또는 R2+Parquet
- **실시간 사용자 추적** — AE 수집 지연 수분

이들은 AE가 제공하는 "얼마나(How many)"와 D1/R2+Parquet이 제공하는
"무엇을(What exactly)"을 결합하는 후속 ADR에서 다룬다.

#### 외부 SaaS 비교 (왜 AE인가)

| | AE (Free) | Mixpanel/Amplitude/PostHog Free |
|---|---|---|
| 비용 | $0 | $0 (~1M events/월) |
| 무료 이벤트 한도 | **100k/day ≈ 3M/월** | 1~20M/월 (도구별) |
| 퍼널/코호트 빌트인 | ❌ 직접 구현 | ✅ |
| 세션 재생 | ❌ | 일부 지원 |
| **데이터 주권** | ✅ (Cloudflare 계정 내) | ❌ (SaaS 클라우드) |
| **Workers 네이티브** | ✅ (binding) | ❌ (외부 HTTP API) |
| **앱인토스 WebView 정책** | ✅ 호환 | ⚠️ 외부 도메인 호출 제약 가능 |

이 프로젝트의 제약(앱인토스 WebView 외부 SaaS 호출 제약, $0 예산, 데이터 주권)에서
AE가 가장 적합. 빌트인 분석 기능이 부족한 부분은 커스텀 대시보드 코드로 보완하며,
고급 분석(퍼널/코호트)은 별도 후속 ADR로 분리한다.

## 비용 분석

| 자원 | Free tier | 현재 사용량 (추정) | 도입 후 |
|---|---|---|---|
| D1 writes | 100k/day | ~10k/day (info 10% 샘플) | 동일 (D1은 여전히 샘플링) |
| **AE writes (NEW)** | **100k/day** | — | ~50k/day (info 샘플링 없이 전수) |
| AE reads | 10k/day | — | <1k/day (대시보드 새로고침) |
| 월 비용 | $0 | $0 | **$0** (Free tier 내) |

100k/day 한도는 현재 트래픽(사내 소규모 도구)에서 절대 도달하지 않음.
사용자 1000명 × 50 events/day = 50k data points/day → Free tier 50% 사용.

Workers Paid($5/mo)로 전환 시 AE 10M/월 = **333k/day**까지 확장 가능.

## Consequences

### 긍정

- **집계 쿼리 수백 배 가속** — columnar + vectorized execution. "error count by day"가
  초 단위 → 밀리초 단위.
- **샘플링 없는 메트릭 확보** — D1은 여전히 샘플링하지만, AE는 100% 적재.
  `_sample_interval` 보정으로 정확한 count.
- **D1 부하 감소** — D1의 역할이 "상세/검색"으로 축소되어 write 부담 완화.
  향후 샘플링 비율을 더 낮춰 D1 용량 절약 가능.
- **시계열 대시보드 기능 추가** — p95, error rate, 추이 차트가 자연스럽게 가능.
- **$0 비용 유지** — Free tier로 충분.
- **Cloudflare 공식 추천 패턴** — AE 공식 문서가 "aggregated queries over
  high-cardinality data"로 명시. 로그 외에도 비즈니스 메트릭(study 생성 수, submission
  제출률)까지 확장 가능.

### 부정

- **코드 복잡도 증가** — `logger.ts` 2곳 적재, `analytics.ts` 신규, dashboard metric
  route 신규. 약 200 LOC 추가 예상.
- **2 시스템 운영** — D1 스키마 마이그레이션 + AE dataset 관리 이중 부담.
- **인증 비밀 추가** — `CF_API_TOKEN` secret. 권한은 "Analytics Engine read" 최소 권장.
- **3개월 보관 한계** — 장기 트렌드 분석(1년+)은 [ADR-014 R2 + Parquet](./adr-014-r2-parquet-archiving.md)로 보완.
- **고카디널리티 blob 리스크** — `userId` 같은 필드가 equitable sampling에 미치는 영향을
  초기 1~2주간 모니터링 필요.

### 중립

- AE의 automatic adaptive sampling은 대부분 환영하지만, 원하는 시점의 정확한 count가
  안 나올 수 있음 (ABR이 긴 time range에서 더 낮은 해상도 사용).
- D1 스키마 변경 없음 — AE는 D1과 독립적.
- 클라이언트 코드 변경 없음 — `POST /logs` API 응답 그대로.

## Alternatives Considered

### A. D1만 유지 + FTS5/JSON generated column (ADR-011 분석의 1, 2번)
- **장점**: 인프라 변경 없음, D1 스키마만 확장
- **기각**: row-store 근본 한계 미해결. 집계 쿼리 비용은 여전히 선형 증가.
  FTS5는 검색만 빠르게 할 뿐 COUNT/GROUP BY 가속은 아님.

### B. R2 + Parquet + DuckDB (ADR-011 분석의 2번)
- **장점**: 거의 무제한 보관, 컬럼 스토어, $0에 가까운 비용
- **기각**: **실시간 아님**. Parquet 직렬화 → R2 업로드 → 쿼리 파이프라인 구축 필요.
  "최근 1시간 error rate" 같은 실시간 대시보드에 부적합. 배치 분석용.
  → 본 ADR과 **배타적이지 않음**. [ADR-014](./adr-014-r2-parquet-archiving.md)에서 "AE 3개월 + R2 영구" 조합으로 구체화.

### C. ClickHouse Cloud
- **장점**: 엔터프라이즈급 OLAP, 가장 강력한 기능
- **기각**: ~$100+/mo 최소 비용. ADR-011의 $0 예산 원칙 위반. Workers에서 외부 HTTP 호출.

### D. Logpush → R2 (Cloudflare 자동 파이프라인)
- **장점**: Workers Logs 자동 export, 코드 최소
- **기각**: Workers Paid($5/mo) 필요. 현재 Free tier. 또한 Logpush는 Workers Logs(Tier 1,
  3일 보관)만 export — D1의 영속 로그를 대체하지 않음.

### E. 그대로 유지
- **장점**: 변경 비용 0
- **기각**: 트래픽 증가에 따라 집계 쿼리 선형 저하. 대시보드 신규 기능(p95, 추이 차트)
  요구 충족 불가. "log-olap" repo 이름에 부합하지 않음.

## Migration Plan

4단계 phase 도입. 각 phase는 독립적으로 롤백 가능.

### Phase 1 — 기반 인프라 (1일)
- AE dataset 2개 생성: `studyops_logs_dev`, `studyops_logs_prod`
- `wrangler.jsonc` 양쪽 환경에 `analytics_engine_bindings` 추가
- `CF_API_TOKEN` secret 발급 및 등록 (Account Analytics read 권한)
- Boot-check에 AE 바인딩 존재 검증 추가

### Phase 2 — Dual-write (1~2일)
- `apps/server/src/lib/analytics.ts` 구현 + 단위 테스트
- `lib/logger.ts::logWithContext`에 AE write 추가 (샘플링 없이)
- `routes/logs.ts` 클라이언트 batch 경로에도 AE write 추가 (`writeDataPoints` 복수형)
- dev 환경 1일 검증 — dataset에 데이터 쌓이는지, 카디널리티 분포 확인

### Phase 3 — 메트릭 쿼리 엔드포인트 (2~3일)
- `routes/admin/logs-metrics.ts` 구현 — 4개 메트릭 (error_rate, top_events, p95, timeseries)
- 응답 캐싱 (KV 또는 인메모리, 30s TTL — `_sample_interval` 때문에 짧은 캐시 안전)
- 단위/통합 테스트

### Phase 4 — 대시보드 UI (별도 작업)
- `/admin/logs` 페이지에 차트 컴포넌트 추가 (chart.js / recharts / 직접 SVG)
- 기존 row 리스트는 D1 조회 유지

### Phase 5 — R2 Parquet 아카이빙 ([ADR-014](./adr-014-r2-parquet-archiving.md))
- AE 3개월 + D1 보관 만료 분을 R2 Parquet으로 영구 보관
- DuckDB 워크스타일 분석용. 구체적 설계는 ADR-014 참조.

## Open Questions

1. **userId 카디널리티 영향** — 초기 1~2주 모니터링 후, 필요하면 `studyops_logs_users`
   별도 dataset으로 분리. 진단 쿼리는 `apps/server/src/routes/admin/logs-metrics.ts` 의
   `CARDINALITY_DIAGNOSTIC_SQL` 상수로 준비됨. 판단 기준:
   - `cardinality_ratio > 0.5` (distinct users / total rows) → 고카디널리티 경고, dataset 분리 검토
   - `top_user_ratio < 0.01` (TOP 1 user / total) → long-tail 분포, 분리 효과 미미
2. **ABR 샘플링 정확도** — 30일 time range 쿼리가 1일 time range 대비 얼마나
   부정확한지 측정. 공식 문서상 "fixed time budget"이지만 실측 필요.
3. **메트릭 캐싱 전략** — KV(글로벌, 유료 tier 확장시) vs D1 cache table vs 인메모리.
4. **AE 쿼리 실패 시 폴백** — AE SQL API 장애시 대시보드에 빈 차트 표시 vs
   D1 fallback 집계 (느리지만 동작).

## References

- Cloudflare Workers Analytics Engine — 개요: https://developers.cloudflare.com/analytics/analytics-engine/
- Limits (1 index + 20 blobs + 20 doubles, 16KB blob, 250 data points/invocation): https://developers.cloudflare.com/analytics/analytics-engine/limits/
- Pricing (Free 100k/day writes + 10k/day reads; Paid 10M/월 + $0.25/M writes): https://developers.cloudflare.com/analytics/analytics-engine/pricing/
- Get-started (writeDataPoint 시그니처): https://developers.cloudflare.com/analytics/analytics-engine/get-started/
- SQL API: https://developers.cloudflare.com/analytics/analytics-engine/sql-api/
- Sampling (equitable + ABR): https://developers.cloudflare.com/analytics/analytics-engine/sampling/
- Write to Analytics Engine (Worker 예제): https://developers.cloudflare.com/workers/examples/analytics-engine/
- ADR-011 (로깅 아키텍처 원본 — 본 ADR이 확장)
- ADR-007 (dev/prod 격리 패턴 — AE dataset에도 동일 적용)
- ADR-008 (배포 게이트 — Phase 1~3 PR 게이트로 연동)
