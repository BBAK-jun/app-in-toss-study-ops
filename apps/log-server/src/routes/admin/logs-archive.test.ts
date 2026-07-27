import { describe, it, expect } from 'vitest';
import { __test } from './logs-archive';

const { buildScanPrefix, extractPartitionPrefix, MAX_SCAN_OBJECTS, MAX_RETURN_ROWS } = __test;

describe('buildScanPrefix', () => {
  it('필터 없을 때 빈 문자열 (전체 스캔)', () => {
    expect(buildScanPrefix(undefined, undefined, undefined, undefined)).toBe('');
  });

  it('year만 있을 때 year= prefix', () => {
    expect(buildScanPrefix(2026, undefined, undefined, undefined)).toBe('year=2026/');
  });

  it('year + month 있을 때 2자리 zero-pad', () => {
    expect(buildScanPrefix(2026, 3, undefined, undefined)).toBe('year=2026/month=03/');
  });

  it('year + month + day', () => {
    expect(buildScanPrefix(2026, 3, 15, undefined)).toBe('year=2026/month=03/day=15/');
  });

  it('year + month + day + level — full hive path', () => {
    expect(buildScanPrefix(2026, 3, 15, 'error')).toBe('year=2026/month=03/day=15/level=error/');
  });

  it('level 단독은 prefix 불가 (빈 문자열, in-memory 필터)', () => {
    expect(buildScanPrefix(undefined, undefined, undefined, 'warn')).toBe('');
  });

  it('year + level (month/day 누락) → year까지만, level은 in-memory', () => {
    expect(buildScanPrefix(2026, undefined, undefined, 'error')).toBe('year=2026/');
  });

  it('year + month + level (day 누락) → month까지만, level은 in-memory', () => {
    expect(buildScanPrefix(2026, 3, undefined, 'error')).toBe('year=2026/month=03/');
  });

  it('month 단독은 year 없으면 빈 문자열', () => {
    expect(buildScanPrefix(undefined, 5, undefined, undefined)).toBe('');
  });

  it('day 단독은 year 없으면 빈 문자열', () => {
    expect(buildScanPrefix(undefined, undefined, 15, undefined)).toBe('');
  });
});

describe('extractPartitionPrefix', () => {
  it('full hive partition path에서 첫 4세그먼트 반환', () => {
    const key = 'year=2026/month=03/day=15/level=error/20260315-error-0001.jsonl';
    expect(extractPartitionPrefix(key)).toBe('year=2026/month=03/day=15/level=error');
  });

  it('3세그먼트 key는 그대로 반환', () => {
    const key = 'year=2026/month=03/day=15';
    expect(extractPartitionPrefix(key)).toBe('year=2026/month=03/day=15');
  });

  it('짧은 key는 원본 반환', () => {
    expect(extractPartitionPrefix('foo.jsonl')).toBe('foo.jsonl');
  });
});

describe('constants', () => {
  it('MAX_SCAN_OBJECTS — R2 list 1회 호출 상한', () => {
    expect(MAX_SCAN_OBJECTS).toBe(50);
  });

  it('MAX_RETURN_ROWS — 클라이언트 반환 row 상한', () => {
    expect(MAX_RETURN_ROWS).toBe(500);
  });
});
