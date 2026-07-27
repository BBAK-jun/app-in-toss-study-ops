import { describe, it, expect } from 'vitest';
import { __test } from './logs-archive';

const { buildScanPrefix, extractPartitionPrefix, MAX_SCAN_OBJECTS, MAX_RETURN_ROWS } = __test;

describe('buildScanPrefix', () => {
  it('필터 없을 때 빈 문자열 (전체 스캔)', () => {
    expect(buildScanPrefix(undefined, undefined, undefined)).toBe('');
  });

  it('year만 있을 때 year= prefix', () => {
    expect(buildScanPrefix(2026, undefined, undefined)).toBe('year=2026/');
  });

  it('year + month 있을 때 2자리 zero-pad', () => {
    expect(buildScanPrefix(2026, 3, undefined)).toBe('year=2026/month=03/');
  });

  it('year + month + level 있을 때 hive partition path', () => {
    expect(buildScanPrefix(2026, 3, 'error')).toBe('year=2026/month=03/level=error/');
  });

  it('level만 있을 때 level= prefix', () => {
    expect(buildScanPrefix(undefined, undefined, 'warn')).toBe('level=warn/');
  });

  it('month 단독은 degenerate (R2 매칭 없음)하지만 prefix는 생성됨', () => {
    expect(buildScanPrefix(undefined, 5, undefined)).toBe('month=05/');
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
