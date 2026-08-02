import { describe, it, expect } from 'vitest';
import { rateToTier, rateTierToTdsColor, rateTierToHex } from './rate';

describe('rateToTier', () => {
  it('임계 >=0.8 / >=0.5 / <0.5 (기존 RateBadge 와 동일)', () => {
    expect(rateToTier(0)).toBe('low');
    expect(rateToTier(0.49)).toBe('low');
    expect(rateToTier(0.5)).toBe('mid');
    expect(rateToTier(0.79)).toBe('mid');
    expect(rateToTier(0.8)).toBe('high');
    expect(rateToTier(1)).toBe('high');
  });
});

describe('rateTierToTdsColor', () => {
  it('tier → TDS semantic color', () => {
    expect(rateTierToTdsColor('high')).toBe('green');
    expect(rateTierToTdsColor('mid')).toBe('yellow');
    expect(rateTierToTdsColor('low')).toBe('red');
  });
});

describe('rateTierToHex', () => {
  it('tier → hex (기존 getRateColor 팔레트 불변)', () => {
    expect(rateTierToHex('high')).toBe('#34C759');
    expect(rateTierToHex('mid')).toBe('#FFCC00');
    expect(rateTierToHex('low')).toBe('#FF3B30');
  });
});

describe('round-trip: rate → tier → color', () => {
  it('엔드투엔드 일관성', () => {
    expect(rateTierToTdsColor(rateToTier(0.9))).toBe('green');
    expect(rateTierToHex(rateToTier(0.2))).toBe('#FF3B30');
    expect(rateTierToTdsColor(rateToTier(0.6))).toBe('yellow');
  });
});
