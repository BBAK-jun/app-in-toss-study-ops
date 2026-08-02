// 제출(submission) 도메인 커널 — DDD 순수 도메인 계층.
// 인프라(D1/Drizzle, Hono, MCP SDK, TDS)에 0개 의존. 서버·클라이언트 공유.
// ADR-003 개정(8/3): shared 에 순수 도메인 runtime 커널 허용 — logs.ts(ADR-011) 선례.

// ─── 도메인 산술 (계산) ──────────────────────────────────────────────────────

/**
 * 제출률(0..1). total <= 0 이면 0 (0으로 나눔 가드).
 * 기존 인라인 `total > 0 ? submitted / total : 0` 의 단일 출처.
 */
export function computeSubmissionRate(submittedCount: number, total: number): number {
  return total > 0 ? submittedCount / total : 0;
}

/**
 * 정수 퍼센트(0..100). Math.round(half-toward-+Infinity).
 * 기존 인라인 `Math.round(rate * 100)` 의 단일 출처.
 */
export function ratePercent(rate: number): number {
  return Math.round(rate * 100);
}

// ─── 분류 ────────────────────────────────────────────────────────────────────

/**
 * 제출률 tier. 임계 >=0.8 / >=0.5 는 기존 RateBadge.tsx 와 동일.
 * (올바르게 연결된 RateBadge 경로의 가시적 변화를 0으로.)
 */
export type RateTier = 'high' | 'mid' | 'low';

/** 0..1 rate → tier. */
export function rateToTier(rate: number): RateTier {
  if (rate >= 0.8) return 'high';
  if (rate >= 0.5) return 'mid';
  return 'low';
}

// ─── 표현 매핑 (tier → 소비자별 포맷) ─────────────────────────────────────────
// 모두 순수 함수. UI/Discord 라이브러리 의존 없이 리터럴만 반환.

/** tier → TDS Badge semantic color (클라이언트 RateBadge 용). */
export function rateTierToTdsColor(tier: RateTier): 'green' | 'yellow' | 'red' {
  switch (tier) {
    case 'high':
      return 'green';
    case 'mid':
      return 'yellow';
    case 'low':
      return 'red';
  }
}

/** tier → hex (클라이언트 인라인 스타일/진행바 용). 기존 getRateColor 팔레트. */
export function rateTierToHex(tier: RateTier): string {
  switch (tier) {
    case 'high':
      return '#34C759';
    case 'mid':
      return '#FFCC00';
    case 'low':
      return '#FF3B30';
  }
}

/** tier → Discord embed color int (24-bit RGB). 기존 webhook.ts:63 값. */
export function rateTierToDiscordInt(tier: RateTier): number {
  switch (tier) {
    case 'high':
      return 0x22c55e;
    case 'mid':
      return 0xf59e0b;
    case 'low':
      return 0xef4444;
  }
}
