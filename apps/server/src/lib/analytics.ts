// Analytics Engine 데이터 포인트 작성 헬퍼 — ADR-013 Tier 2.
//
// Logger가 D1 INSERT와 병행해서 호출. AE는 non-blocking writeDataPoint() API를
// 제공하므로 ctx.waitUntil로 감쌀 필요 없음 (Cloudflare 공식 문서).
//
// 데이터 매핑 (ADR-013 §2):
//   index1  = event                       (equitable sampling 키, ~40종)
//   blob1   = level                       (5종)
//   blob2   = source                      (4종)
//   blob3   = env                         (2종)
//   blob4   = path                        (중간 카디널리티)
//   blob5   = method                      (5종)
//   blob6   = String(status)              (~30종, 문자열 필터용)
//   blob7   = String(userId)              (고카디널리티 — 모니터링 대상)
//   double1 = LOG_LEVEL_WEIGHT[level]     (숫자 필터/정렬용)
//   double2 = durationMs                  (핵심 메트릭)
//   double3 = status | 0                  (avg/percentile용)
//   double4 = 1                           (count weight — SUM(_sample_interval * 1) = 보정 count)
//
// 생략 필드 (D1에만): sessionId, requestId, context, stack, message, version,
// userAgent, ipHash — row 단위 조회/검색 전용이라 AE에 넣지 않음.

import { LOG_LEVEL_WEIGHT, type LogEntry } from '@studyops/shared';

// 단일 entry → AE data point. 실패해도 caller에 영향 주지 않음 (best-effort).
export function writeLogDataPoint(
  analytics: AnalyticsEngineDataset,
  entry: LogEntry,
): void {
  try {
    analytics.writeDataPoint(toDataPoint(entry));
  } catch (err) {
    // AE write 실패는 D1 + Tier 1이 있으므로 무시. 에러 로그만.
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'log.analytics_write_failed',
        message: 'AE writeDataPoint failed',
        originalEvent: entry.event,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

// 복수 entries → AE data points. 250 cap 초과시에도 안전하게 내부에서 루프
// (AE writeDataPoint는 단일 포인트만 받음 — ADR-013 §4의 writeDataPoints 복수형은
//  CF 런타임에 존재하지 않음. 공식 타입 AnalyticsEngineDataset 확인).
// 클라이언트 batch 라우트(POST /logs)에서 사용.
export function writeLogDataPoints(
  analytics: AnalyticsEngineDataset,
  entries: LogEntry[],
): void {
  if (entries.length === 0) return;

  try {
    for (const entry of entries) {
      analytics.writeDataPoint(toDataPoint(entry));
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'log.analytics_batch_failed',
        message: 'AE writeDataPoint batch loop failed',
        attempted: entries.length,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

// LogEntry → AE data point 객체. 테스트 가능하도록 분리.
// 반환 타입은 AE 슬롯을 모두 채운 보장된 형태 — AnalyticsEngineDataPoint와 구조 호환.
export function toDataPoint(entry: LogEntry): {
  indexes: string[];
  blobs: string[];
  doubles: number[];
} {
  return {
    indexes: [entry.event],
    blobs: [
      entry.level,
      entry.source,
      entry.env ?? 'dev',
      entry.path ?? '',
      entry.method ?? '',
      String(entry.status ?? ''),
      entry.userId != null ? String(entry.userId) : '',
      // blob8~20 예약 — 향후 메트릭 확장시 사용.
    ],
    doubles: [
      LOG_LEVEL_WEIGHT[entry.level] ?? 0,
      entry.durationMs ?? 0,
      entry.status ?? 0,
      1, // count weight. SUM(_sample_interval * double4)로 보정된 count 산출.
    ],
  };
}
