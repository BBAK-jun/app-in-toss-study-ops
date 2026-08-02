// 제출(submission) 도메인의 순수 산술 — DDD 도메인 커널.
// 인프라(D1/Drizzle, Hono, MCP SDK)에 0개 의존. 어디서든 안전 재사용.
// ADR-003(shared 타입 전용)을 존중해 서버 로컬에 둔다. shared 이동은 Phase 3(ADR-003 개정 후).

/**
 * 제출률(0..1). total <= 0 이면 0 (0으로 나눔 가드).
 * 기존 4곳 인라인 `total > 0 ? submitted / total : 0` 과 동일.
 */
export function computeSubmissionRate(submittedCount: number, total: number): number {
  return total > 0 ? submittedCount / total : 0;
}

/**
 * 정수 퍼센트(0..100). Math.round 로 기존 5곳 인라인 `Math.round(rate * 100)` 과 byte-identical.
 * (JS Math.round 는 반올림 시 +Infinity 방향. half-up.)
 */
export function ratePercent(rate: number): number {
  return Math.round(rate * 100);
}
