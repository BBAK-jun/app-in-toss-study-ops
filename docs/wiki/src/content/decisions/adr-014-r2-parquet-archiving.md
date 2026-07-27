---
id: adr-014
title: R2 + Parquet 장기 보관 — D1 보관 만료 로그 영구 아카이빙
status: accepted
date: 2026-07-27
supersededBy: null
tags: [server, observability, r2, parquet, duckdb, archive, long-term-storage]
---

# ADR-014: R2 + Parquet 장기 보관 — D1 보관 만료 로그 영구 아카이빙

## Context

ADR-013 Phase 1~4를 거치며 다음 두 가지 보관 한계가 남았다:

1. **AE 3개월 고정 보관**
   - Analytics Engine은 시스템 설정 불가능한 3개월 보관 한계를 가진다.
   - "작년 이맘때 error rate 추이", "신규 기능 출시 후 6개월간 adoption 곡선" 같은
     장기 트렌드 분석이 AE 단독으로는 불가능.
2. **D1 레벨별 보관 (debug 7일 ~ fatal 365일)**
   - ADR-011 정책에 따라 D1은 용량 보호를 위해 짧은 보관 기간을 유지한다.
   - debug/info는 7~30일 만에 영구 삭제되어, 장애 회귀 분석 시 "3개월 전 디버그 로그"를
     복원할 방법이 없다.

ADR-013 §9(보존 정책)와 §Alternatives B에서 명시적으로 "후속 ADR에서 R2 + Parquet
조합 제안 예정"이라고 예고했는데, 본 ADR이 그 후속이다.

목표: **$0 예산을 유지하면서** 만료된 로그를 영구 보관하고, 시계열 분석 도구(DuckDB
등)가 직접 쿼리할 수 있는 형태로 저장한다.

## Decision

**D1 retention cron이 삭제하기 직전인 로그 행을 R2 + Parquet으로 아카이빙한다.
AE는 실시간 집계 용도로 그대로 두고, R2는 "raw 영구 보관 + 배치 분석"을 담당한다.**

전체 파이프라인:

```
로그 발생
  ├─ Tier 1: Workers Logs (3일)
  ├─ Tier 2: AE (3개월, 집계)
  ├─ Tier 3: D1 (레벨별 7~365일, 상세/검색)
  └─ Tier 5 (NEW, 본 ADR): R2 + Parquet (영구, 배치 분석)
       ↑
       D1 retention cron 만료 1일 전 → Parquet 직렬화 → R2 PUT
```

→ **AE는 "최근 3개월 얼마나", D1은 "최근 N일 무엇을", R2는 "전체 기간 원시+분석"을 담당.**

### 1. R2 버킷 레이아웃

dev/prod 격리는 ADR-007 D1, ADR-013 AE 패턴과 동일하게 **버킷 이름으로 분리**:

```
studyops-log-archive-dev   (dev 환경용 — 로컬 테스트/seed 데이터)
studyops-log-archive-prod  (production 영구 보관)
```

파티션 스키마 (Hive-style, DuckDB pruning에 유리):

```
s3://studyops-log-archive-prod/
  year=2026/
    month=07/
      day=27/
        level=error/
          20260727-error-0001.parquet
          20260727-error-0002.parquet
        level=info/
          20260727-info-0001.parquet
        level=debug/
          ...
```

- 파티션 키: `year`, `month`, `day`, `level`. `env`는 버킷 이름으로 분리되므로 중복 제외.
- 파일명: `{YYYYMMDD}-{level}-{batch_seq}.parquet` (batch_seq는 일별 누적 시퀀스).
- 단일 Parquet 파일 목표 크기: 8~64MB (R2 multipart + DuckDB 병렬 스캔 최적점).

### 2. Parquet 직렬화

Workers 런타임에는 네이티브 Parquet writer가 없다. 세 가지 옵션을 평가:

| 옵션 | 번들 크기 | Workers 호환 | 결정 |
|---|---|---|---|
| **A. `parquet-wasm`** (Apache Arrow 기반) | ~1.5MB wasm | ✅ 공식 지원 | **채택** |
| B. JSON Lines (`.jsonl`) 직렬화 | 0KB | ✅ | 폴백 (초기 구현 단순화용) |
| C. Arrow IPC 스트리밍 + 외부 변환 | ~600KB | ⚠️ (Worker → R2 → 변환 단계) | 기각 (파이프라인 복잡) |

초기 Phase 2에서는 **JSON Lines** 로 먼저 롤아웃 (복잡도 최소, 데이터 영구 보관 먼저 확보).
Phase 3에서 `parquet-wasm` 으로 마이그레이션 (DuckDB 컬럼 스캔 이점 확보).

Parquet 스키마 (D1 `logs` 테이블 1:1 매핑):

```parquet
message studyops_log {
  required int64 id;
  required int64 ts;
  required binary level;
  required binary source;
  required binary event;
  required binary message;
  optional int32 user_id;
  optional binary session_id;
  optional binary request_id;
  optional binary method;
  optional binary path;
  optional int32 status;
  optional int32 duration_ms;
  optional binary context (JSON);     // UTF-8 JSON string
  optional binary stack;
  optional binary env;
  optional binary version;
  optional binary user_agent;
  optional binary ip_hash;
}
```

### 3. Export 워크플로

**기존 cron (retention) 확장**. `apps/server/src/cron/retention.ts`의 매일 00:30 KST 실행에
아카이빙 스텝을 추가:

```ts
// 1. 아카이빙 대상 조회: 오늘 만료 예정인 row
//    debug 7d+, info 30d+, warn 90d+, error 90d+ (fatal 365d는 D1 유지)
const expiring = await db.select().from(logs)
  .where(and(
    lte(logs.ts, archiveCutoffTimestamp),
    not(eq(logs.level, 'fatal')),  // fatal은 D1에 계속 보관
  ))
  .orderBy(logs.ts)
  .limit(BATCH_SIZE);  // 1000행/배치 (Workers CPU 시간 고려)

// 2. Parquet (또는 초기엔 JSONL) 직렬화
const buffer = await serializeRows(rows);

// 3. R2 PUT (partitioned key)
const partitionKey = buildPartitionKey(rows[0].ts, rows[0].level);
await env.LOG_ARCHIVE.put(partitionKey, buffer);

// 4. 원본 D1 row 삭제
await db.delete().from(logs).where(inArray(logs.id, rows.map(r => r.id)));
```

- 1 invocation당 CPU 시간 한계 (Free 10ms / Paid 30s) 내에서 처리하기 위해 청크 단위 처리.
- 실패 시 재시도: 아카이빙 성공 후에만 D1 삭제 → R2 write 실패시 데이터 손실 없음.

### 4. R2 binding (`wrangler.jsonc`)

```jsonc
"r2_buckets": [
  {
    "binding": "LOG_ARCHIVE",
    "bucket_name": "studyops-log-archive-dev"
  }
]
```

`env.production` 블록에는 `studyops-log-archive-prod`.

### 5. 쿼리 패스

#### A. 배치 분석 (기본): 외부 DuckDB

```sql
-- 로컬 DuckDB CLI에서 R2를 S3 호환 엔드포인트로 직접 읽기
INSTALL httpfs;
LOAD httpfs;
SET s3_endpoint = '<account>.r2.cloudflarestorage.com';
SET s3_access_key_id = '<R2 access key>';
SET s3_secret_access_key = '<R2 secret>';

SELECT level, COUNT(*) AS cnt, AVG(duration_ms) AS p50
FROM read_parquet('s3://studyops-log-archive-prod/year=2026/month=*/day=*/*.parquet')
WHERE event = 'study.created'
GROUP BY level;
```

→ 데이터 팀/운영자가 수동 실행. 빌트인 UI는 Phase 3에서 검토.

#### B. 대시보드 UI (후순위): DuckDB-Wasm

`@duckdb/duckdb-wasm`을 클라이언트에서 로드하여 R2에서 Parquet을 fetch → in-browser 분석.
제약:
- Wasm 번들 (~10MB) — 초기 로드 비용.
- R2 CORS 설정 필요.
- 큰 데이터셋(수 GB)은 브라우저 메모리 한계.

→ Phase 3에서 PoC 후 결정.

#### C. AE SQL API + R2 보조 (가설)

AE는 3개월 이내 집계, R2는 3개월 이전 원시 데이터. 대시보드에서는 time range에 따라
자동으로 어느 소스를 쿼리할지 분기. Phase 4 이슈.

### 6. Retention / Lifecycle

- **기본 정책**: R2 무기한 보관 (R2 Free tier는 egress 무료, 스토리지만 과금).
- **옵션 R2 lifecycle rule**: 7년 후 Glacier 유사 저비용 tier로 이동 (Cloudflare는 현재
  단일 tier이므로 실제로는 적용 불가. 향후 기능 추가 시).
- **수동 삭제**: 개별 Privacy 요청 (GDPR "잊혀질 권리")시 partition 단위 또는 객체 단위 삭제.
  - PII 해시는 이미 ADR-011 sanitize 거친 상태이므로 실제 요청 빈도 낮을 것.

### 7. PII / 보안

- ADR-011의 sanitize 정책이 그대로 적용된 로그만 아카이빙 (context whitelist 통과).
- R2 버킷은 기본 private. R2 access key는 server-side `wrangler secret`.
- 외부 쿼리용 R2 token은 별도 발급 (read-only, 버킷 범위 제한).

## 비용 분석

| 자원 | Free tier | 추정 사용량 | 도입 후 |
|---|---|---|---|
| R2 storage | 10GB | — | ~500MB/월 (현재 D1 용량 기준 10배 확장 가정) |
| R2 Class A (PUT) | 1M/월 | — | ~30/일 (cron 1회 × 배치 수) ≈ 900/월 |
| R2 Class B (GET) | 10M/월 | — | 분석 쿼리당 ~수십 → <1k/월 |
| R2 egress | 무료 (인터넷) | — | DuckDB in-browser fetch 비용 0 |
| **월 비용** | — | — | **$0** (10GB 내) |

10GB 초과시 R2 유료 $0.015/GB/월 → 100GB 보관시 약 $1.5/월. 데이터 증가율 추정:
현재 하루 ~10k row × 200 byte/row = 2MB/일 → 14년 걸려야 10GB 도달. 사실상 무제한.

## Consequences

### 긍정

- **영구 보관 확보**: D1 retention 삭제 후에도 데이터 복구 가능. 장애 회귀 분석,
  컴플라이언스 감사, 비즈니스 trend 분석의 기반이 됨.
- **컬럼 스토어 분석**: DuckDB가 Parquet을 직접 읽어 초단위 집계. AE 3개월 한계를
  우회하면서 동일한 워크로드 패턴 유지.
- **데이터 주권 유지**: 외부 SaaS (BigQuery, Snowflake) 없이 Cloudflare 생태계 내 완결.
- **앱인토스 정책 호환**: 모든 데이터 흐름이 Cloudflare 내부. 외부 API 호출 없음.
- **$0 예산 유지**: Free tier 10GB로 수년간 커버 가능.
- **D1 용량 방어**: D1에서 만료된 데이터를 안전하게 옮기므로 D1 row 증가 억제.
  10GB D1 용량 한계 (Free)에 도달하는 시점을 크게 늦춤.

### 부정

- **직렬화 복잡도**: `parquet-wasm` 통합, Workers CPU 시간 관리, 실패 재시도 로직 필요.
  초기 Phase 2에서는 JSONL로 단순화 가능.
- **쿼리 UX 부재**: 외부 DuckDB CLI만으로 사용자 친화적이지 않음. UI 제공은 Phase 3+.
- **스토리지 비용 모니터링**: R2 용량이 10GB에 근접시 알림 필요. (대시보드 또는 cron 점검)
- **이중 저장**: 같은 데이터가 D1(단기) + R2(영구)에 존재 → 쿼리 일관성 주의.
  R2는 실시간 동기화가 아닌 일일 배치이므로, "오늘 23:50에 발생한 로그"는
  내일 00:30 cron 이후에야 R2에 존재.

### 중립

- AE는 본 ADR과 독립. AE의 3개월 데이터는 R2로 export 하지 않는다.
  AE = 실시간 집계 전용, R2 = D1 만료분 영구 보관. 명확한 역할 분담.
- D1 retention cron이 이미 존재하므로 아카이빙 스텝 추가는 incremental.
- 버킷 이름으로 env 격리하는 패턴 유지 (ADR-007, ADR-013과 일관).

## Alternatives Considered

### A. AE → R2 자동 export (Logpush 스타일)
- **장점**: 코드 최소. Cloudflare가 관리.
- **기각**: AE는 현재 Logpush 대상이 아님. D1 Logpush는 Workers Paid($5/mo) 필요.
  본 ADR은 Free tier 유지 목적.

### B. R2 + Parquet 대신 그대로 D1 용량 확장
- **장점**: 인프라 변경 없음.
- **기각**: D1 Free tier 10GB (전체 DB). 로그 테이블이 다른 엔티티(users, studies, ...)
  와 공유. 컬럼 스토어가 아닌 row-store라 집계 비용 선형 증가.

### C. 외부 데이터 웨어하우스 (BigQuery, ClickHouse Cloud)
- **장점**: 관리형 OLAP, 빌트인 UI.
- **기각**: $0 예산 위반. 데이터 주권 침해. 앱인토스 WebView 외부 API 호출 제약 위반.

### D. Parquet 대신 CSV / JSONL 영구 보관
- **장점**: 직렬화 복잡도 0.
- **기각**: 집계 쿼리 비용이 Parquet 대비 수십 배. 컬럼 스토어의 이점이 사라짐.
  다만 Phase 2 초기에는 JSONL로 빠른 롤아웃, Phase 3에서 Parquet 마이그레이션 허용.

### E. 동일 버킷에 단일 Parquet append (partition 없음)
- **장점**: 단순한 키 구조.
- **기각**: DuckDB partition pruning 이점 상실. 특정 일자/레벨만 쿼리할 때
  전체 스캔 비용. Hive partitioning이 마이너한 복잡도로 큰 이득.

## Migration Plan

ADR-013과 동일한 phase 방식. 각 phase 독립적 롤백 가능.

### Phase 1 — 기반 인프라 ✅
- R2 버킷 2개 생성: `studyops-log-archive-dev`, `studyops-log-archive-prod` (수동 생성 필요)
- `wrangler.jsonc` 양쪽 환경에 `r2_buckets` binding 추가 ✅
- Boot-check에 R2 바인딩 존재 검증 추가 ✅ (`r2Archive: configured|missing`)
- ADR-013 README에 Phase 5 링크 추가 ✅

### Phase 2 — JSONL 아카이빙 ✅
- `apps/server/src/lib/archive.ts` 신규 — `serializeRowsToJsonl()`, `buildR2Key()`, `archiveBatch()` ✅
- `apps/server/src/lib/retention.ts`에 아카이빙 스텝 추가 (D1 삭제 전) ✅
  - `archiveAndDeleteOldLogs()`: SELECT → R2 PUT → DELETE by IDs 순서 보장
  - R2 실패시 D1 삭제 수행 안 함 (데이터 손실 방지)
  - fatal 레벨은 아카이브 제외 (ADR-014 §3)
  - R2 바인딩 누락시 graceful degradation (직접 DELETE)
- 단위 테스트 (12개: archive.test.ts) + retention.test.ts 업데이트 ✅
- dev 환경 검증 — 버킷 수동 생성 후 cron 트리거로 확인 필요

### Phase 3 — Parquet 마이그레이션 (연기됨 — JSONL 유지)
**결정**: `parquet-wasm` PoC 결과, 현재 데이터 규모와 아키텍처에서 JSONL을 유지.

분석 근거:
1. **데이터 규모**: 하루 ~10k rows × 200 byte/row = 2MB/일. JSONL 직렬화/역직렬화
   오버헤드가 미측정될 정도로 작음. Parquet column pruning 이점은 수백만 row
   이상에서 의미.
2. **Phase 4 아키텍처**: 대시보드를 서버 사이드 쿼리(Worker → R2 JSONL 직접 읽기)로
   구현. 클라이언트 사이드 DuckDB-Wasm이 없으므로 Parquet 포맷의 주요 이점
   (DuckDB column scan)을 활용하지 못함.
3. **Workers 복잡도**: `parquet-wasm` (~1.5MB)을 Workers 번들에 통합하려면 WASM
   모듈 로딩, Workers 빌드 설정 조정, CPU 시간 증가가 필요. Free tier 10ms
   CPU 한계 내에서 JSONL 직렬화가 안전.
4. **향후 전환 경로**: R2 객체 포맷은 파티션 키로 분리되어 있어, 향후 데이터
   증가시 Parquet 백필 스크립트로 일괄 변환 가능. Phase 3는 "언제든 재개 가능" 상태.

재개 조건:
- 일일 로그 발생량이 100k rows 이상으로 증가
- 또는 외부 DuckDB CLI 기반 정기 분석이 정기적으로 필요해지는 경우

### Phase 4 — 서버 사이드 아카이브 쿼리 대시보드 ✅
**결정**: DuckDB-Wasm 대신 **서버 사이드 쿼리** 방식 채택.

근거:
1. **모바일 WebView 환경**: 앱인토스 WebView에서 duckdb-wasm(~10MB) 초기 다운로드는
   모바일 데이터 환경에서 비현실적. Service Worker 캐싱을 추가해도 첫 로드 비용.
2. **메모리 제약**: 모바일 브라우저 메모리 제약으로 대규모 Parquet in-browser 스캔 불가.
3. **아키텍처 일관성**: 기존 `/admin/logs/metrics` (ADR-013 Phase 3) 와 동일한 패턴 —
   Worker가 직접 소스(AE/R2)를 읽고 JSON 반환.

구현:
- `GET /admin/logs/archive/stats` — R2 객체 수, 총 크기, 날짜 범위
- `GET /admin/logs/archive/query` — 날짜/레벨 필터로 R2 JSONL 스캔, 집계 반환

## Open Questions

1. **parquet-wasm Workers 호환성** — **해결됨 (Phase 3 연기)**. 분석 결과 현재 규모에서
   JSONL이 충분. `parquet-wasm` 통합은 데이터 증가 시 재개 가능. Phase 3 문서 참조.
2. **R2 lifecycle 자동화** — Cloudflare가 lifecycle rule을 지원하기 시작하면
   "1년 후 객체 삭제" 또는 "특정 파티션만 보관" 정책 적용 검토.
3. **D1 → R2 마이그레이션 지연 감내** — 일일 배치이므로 최대 24시간 차트 빈 구간.
   실시간이 필요하면 AE로 보간 표시.
4. **DuckDB-Wasm 번들 전략** — **해결됨 (서버 사이드 채택)**. Phase 4에서 duckdb-wasm
   대신 Worker 기반 서버 사이드 쿼리로 결정. 번들 전략 불필요.
5. **GDPR/개인정보 삭제 요청** — 사용자 요청시 partition 단위/객체 단위 삭제 자동화
   스크립트 필요 여부. 초기에는 수동 처리.

## References

- ADR-011 (로깅 아키텍처 원본 — retention 정책)
- ADR-013 (AE 도입 — 본 ADR이 보완)
- ADR-007 (dev/prod 격리 패턴 — R2 버킷에도 동일 적용)
- Cloudflare R2 — S3 호환 오브젝트 스토리지: https://developers.cloudflare.com/r2/
- R2 Workers binding API: https://developers.cloudflare.com/r2/api/workers/workers-multipart-usage/
- R2 Free tier (10GB storage, 1M Class A/월, 무료 egress): https://developers.cloudflare.com/r2/platform/pricing/
- DuckDB — S3/R2 direct query: https://duckdb.org/docs/extensions/httpfs/s3api.html
- DuckDB-Wasm (in-browser): https://duckdb.org/docs/api/wasm/overview.html
- Apache Parquet format specification: https://parquet.apache.org/docs/
- `parquet-wasm` (Rust → Wasm, Apache Arrow 기반): https://github.com/myperfectgems/parquet-wasm
- Apache Arrow JavaScript: https://arrow.apache.org/docs/js/
