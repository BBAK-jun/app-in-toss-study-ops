import { describe, it, expect } from 'vitest';
import { calculateBackoff, MAX_ATTEMPTS, isWithinMaxAttempts } from './backoff';

describe('calculateBackoff', () => {
  it('attempt 0 → 1s 기준', () => {
    const delay = calculateBackoff(0);
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThanOrEqual(1000);
  });

  it('attempt 1 → 2s 기준', () => {
    const delay = calculateBackoff(1);
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThanOrEqual(2000);
  });

  it('attempt 2 → 4s 기준', () => {
    const delay = calculateBackoff(2);
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThanOrEqual(4000);
  });

  it('attempt 5 → 30s 캡', () => {
    const delay = calculateBackoff(5);
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThanOrEqual(30000);
  });

  it('attempt 6 → 60s 캡 (최대)', () => {
    const delay = calculateBackoff(6);
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThanOrEqual(60000);
  });

  it('attempt 7+ → 60s 캡 유지', () => {
    const delay = calculateBackoff(10);
    expect(delay).toBeLessThanOrEqual(60000);
  });

  it('full jitter: 항상 0 이상', () => {
    for (let i = 0; i < 100; i++) {
      expect(calculateBackoff(i)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('isWithinMaxAttempts', () => {
  it('MAX_ATTEMPTS는 7', () => {
    expect(MAX_ATTEMPTS).toBe(7);
  });

  it('attempt < 7 → true', () => {
    expect(isWithinMaxAttempts(0)).toBe(true);
    expect(isWithinMaxAttempts(6)).toBe(true);
  });

  it('attempt >= 7 → false (dead-letter)', () => {
    expect(isWithinMaxAttempts(7)).toBe(false);
    expect(isWithinMaxAttempts(100)).toBe(false);
  });
});
