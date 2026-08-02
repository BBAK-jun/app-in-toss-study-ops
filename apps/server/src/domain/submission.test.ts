import { describe, it, expect } from 'vitest';
import { computeSubmissionRate, ratePercent } from './submission';

describe('computeSubmissionRate', () => {
  it('0으로 나눔 가드: total <= 0 이면 0', () => {
    expect(computeSubmissionRate(0, 0)).toBe(0);
    expect(computeSubmissionRate(3, 0)).toBe(0);
  });

  it('submitted/total 계산 (기존 인라인과 동일)', () => {
    expect(computeSubmissionRate(3, 5)).toBe(0.6);
    expect(computeSubmissionRate(5, 5)).toBe(1);
    expect(computeSubmissionRate(0, 5)).toBe(0);
  });
});

describe('ratePercent', () => {
  it('Math.round(rate*100) half-up (기존 인라인과 byte-identical)', () => {
    expect(ratePercent(0)).toBe(0);
    expect(ratePercent(0.333333)).toBe(33);
    expect(ratePercent(0.5)).toBe(50);
    expect(ratePercent(0.875)).toBe(88);
    expect(ratePercent(1)).toBe(100);
  });

  // MCP 컨트랙트 동치 핀: ratePercent(rate) 는 기존 인라인 Math.round(rate*100) 과
  // 항상 동일해야 한다. 어기면 MCP 툴 rate/ratePercent 출력이 드리프트 → 컨트랙트 위반.
  it('MCP rate corpus 에서 Math.round(rate*100) 및 /100 과 동치', () => {
    const corpus = [0, 0.005, 1 / 3, 0.5, 0.6, 0.875, 1];
    for (const r of corpus) {
      expect(ratePercent(r)).toBe(Math.round(r * 100));
      expect(ratePercent(r) / 100).toBe(Math.round(r * 100) / 100);
    }
  });
});
