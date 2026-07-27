import { Badge } from '@toss/tds-mobile';

// 제출률 → TDS Badge 색상 토큰 매핑.
// >=80% green / >=50% yellow / <50% red (문서 디자인 디테일).
export function rateBadgeColor(rate: number): 'green' | 'yellow' | 'red' {
  if (rate >= 0.8) return 'green';
  if (rate >= 0.5) return 'yellow';
  return 'red';
}

// 동일한 0.8/0.5 기준을 사용하는 hex 색상 (진행바, 텍스트 등 Badge 외부 표시용).
// 단일 진실 원천: 모든 제출률 색상은 이 두 함수를 통해서만 결정된다.
const RATE_HEX: Record<'green' | 'yellow' | 'red', string> = {
  green: '#16A34A',
  yellow: '#F59E0B',
  red: '#EF4444',
};

export function rateHexColor(rate: number): string {
  return RATE_HEX[rateBadgeColor(rate)];
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
