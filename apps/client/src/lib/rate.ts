// 제출률(rate, 0..1) → 표현 토큰 통일 매퍼.
// 기존 RateBadge.tsx(0~1, ≥0.8/≥0.5) 와 formatDate.ts getRateColor(0~100) 두 구현을
// 단일 출처로 통합. 입력은 항상 0..1 (RoundStatusDto.rate / RoundSummary.rate 와 일치).
// 임계값(≥0.8/≥0.5)은 기존 RateBadge 경로와 정확히 일치 → 올바르게 연결된 경로는 변화 0.

export type RateTier = 'high' | 'mid' | 'low';

/** 0..1 rate → tier. 임계치 ≥0.8 / ≥0.5 는 기존 RateBadge.tsx 와 동일. */
export function rateToTier(rate: number): RateTier {
  if (rate >= 0.8) return 'high';
  if (rate >= 0.5) return 'mid';
  return 'low';
}

/** tier → TDS Badge semantic color (RateBadge 용). */
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

/** tier → hex (인라인 스타일 UI/진행바 용). 기존 getRateColor hex → 화면 팔레트 불변. */
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
