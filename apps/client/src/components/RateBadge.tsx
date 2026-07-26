import { Badge } from '@toss/tds-mobile';

// 제출률 → TDS Badge 색상 토큰 매핑.
// >=80% green / >=50% yellow / <50% red (문서 디자인 디테일).
export function rateBadgeColor(rate: number): 'green' | 'yellow' | 'red' {
  if (rate >= 0.8) return 'green';
  if (rate >= 0.5) return 'yellow';
  return 'red';
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
