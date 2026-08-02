import { rateToTier, rateTierToHex } from './rate';

/**
 * 날짜 관련 유틸리티 함수
 */

/**
 * 마감일 기반 긴급도 계산
 */
export function getDeadlineUrgency(dueAt: string | number | null): { color: string; label: string; bold?: boolean } {
  if (!dueAt) {
    return { color: '#8B95A1', label: '마감일 미정' };
  }

  const now = new Date();
  const due = new Date(dueAt);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { color: '#FF3B30', label: '마감일 경과', bold: true };
  }

  if (diffDays === 0) {
    return { color: '#FF9500', label: '오늘 마감', bold: true };
  }

  if (diffDays <= 2) {
    return { color: '#FF9500', label: '2일 이내' };
  }

  if (diffDays <= 7) {
    return { color: '#FFCC00', label: '1주 이내' };
  }

  return { color: '#34C759', label: `${diffDays}일 남음` };
}

/**
 * 제출률(0..1) 기반 색상. 임계 로직은 lib/rate 단일 출처.
 * 입력은 0..1 (RoundStatusDto.rate / RoundSummary.rate 와 일치).
 */
export function getRateColor(rate: number): string {
  return rateTierToHex(rateToTier(rate));
}