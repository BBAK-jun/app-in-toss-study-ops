import { Badge } from '@toss/tds-mobile';
import { rateToTier, rateTierToTdsColor } from '@studyops/shared';

// 제출률 → TDS Badge 색상 토큰. 임계 로직은 @studyops/shared 단일 출처.
// 공개 export 유지 — RoundDetailPage.tsx 가 rateBadgeColor(rate) === 'green' 비교로 사용.
export function rateBadgeColor(rate: number): 'green' | 'yellow' | 'red' {
  return rateTierToTdsColor(rateToTier(rate));
}

interface RateBadgeProps {
  rate: number; // 0~1
  size?: 'large' | 'medium' | 'small' | 'xsmall';
  withLabel?: boolean; // true 면 "60% (3/5)" 형태, false 면 퍼센트만
  submittedCount?: number;
  total?: number;
}

// 제출률 표시 Badge. TDS Badge 의 semantic color(green/yellow/red) 사용.
export function RateBadge({
  rate,
  size = 'small',
  withLabel = false,
  submittedCount,
  total,
}: RateBadgeProps) {
  const pct = Math.round(rate * 100);
  const label = withLabel && submittedCount !== undefined && total !== undefined
    ? `${pct}% (${submittedCount}/${total})`
    : `${pct}%`;
  return (
    <Badge size={size} variant="fill" color={rateBadgeColor(rate)}>
      {label}
    </Badge>
  );
}
