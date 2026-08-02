import { describe, it, expect } from 'vitest';
import {
  computeSubmissionRate,
  ratePercent,
  rateToTier,
  rateTierToTdsColor,
  rateTierToHex,
  rateTierToDiscordInt,
} from './submission';

describe('computeSubmissionRate', () => {
  it('0으로 나눔 가드: total <= 0 이면 0', () => {
    expect(computeSubmissionRate(0, 0)).toBe(0);
    expect(computeSubmissionRate(3, 0)).toBe(0);
  });

  it('submitted/total 계산', () => {
    expect(computeSubmissionRate(3, 5)).toBe(0.6);
    expect(computeSubmissionRate(5, 5)).toBe(1);
    expect(computeSubmissionRate(0, 5)).toBe(0);
  });
});

describe('ratePercent', () => {
  it('Math.round(rate*100) half-up', () => {
    expect(ratePercent(0)).toBe(0);
    expect(ratePercent(0.333333)).toBe(33);
    expect(ratePercent(0.5)).toBe(50);
    expect(ratePercent(0.875)).toBe(88);
    expect(ratePercent(1)).toBe(100);
  });

  // MCP 컨트랙트 동치 핀: ratePercent(rate) 는 인라인 Math.round(rate*100) 과 항상 동일.
  it('MCP rate corpus 에서 Math.round(rate*100) 및 /100 과 동치', () => {
    const corpus = [0, 0.005, 1 / 3, 0.5, 0.6, 0.875, 1];
    for (const r of corpus) {
      expect(ratePercent(r)).toBe(Math.round(r * 100));
      expect(ratePercent(r) / 100).toBe(Math.round(r * 100) / 100);
    }
  });
});

describe('rateToTier', () => {
  it('임계 >=0.8 / >=0.5 / <0.5', () => {
    expect(rateToTier(0)).toBe('low');
    expect(rateToTier(0.49)).toBe('low');
    expect(rateToTier(0.5)).toBe('mid');
    expect(rateToTier(0.79)).toBe('mid');
    expect(rateToTier(0.8)).toBe('high');
    expect(rateToTier(1)).toBe('high');
  });
});

describe('tier → 소비자별 포맷 매핑', () => {
  it('rateTierToTdsColor: TDS semantic color', () => {
    expect(rateTierToTdsColor('high')).toBe('green');
    expect(rateTierToTdsColor('mid')).toBe('yellow');
    expect(rateTierToTdsColor('low')).toBe('red');
  });

  it('rateTierToHex: 기존 getRateColor 팔레트 불변', () => {
    expect(rateTierToHex('high')).toBe('#34C759');
    expect(rateTierToHex('mid')).toBe('#FFCC00');
    expect(rateTierToHex('low')).toBe('#FF3B30');
  });

  it('rateTierToDiscordInt: 기존 webhook.ts:63 값 불변', () => {
    expect(rateTierToDiscordInt('high')).toBe(0x22c55e);
    expect(rateTierToDiscordInt('mid')).toBe(0xf59e0b);
    expect(rateTierToDiscordInt('low')).toBe(0xef4444);
  });
});

describe('round-trip: rate → tier → 포맷', () => {
  it('엔드투엔드 일관성', () => {
    expect(rateTierToTdsColor(rateToTier(0.9))).toBe('green');
    expect(rateTierToHex(rateToTier(0.2))).toBe('#FF3B30');
    expect(rateTierToDiscordInt(rateToTier(0.6))).toBe(0xf59e0b);
  });
});
