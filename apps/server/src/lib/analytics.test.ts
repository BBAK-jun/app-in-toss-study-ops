// analytics.ts 단위 테스트 — ADR-013 데이터 포인트 매핑 + 250 cap 청크 분할 검증.

import { describe, it, expect, vi } from 'vitest';
import {
  writeLogDataPoint,
  writeLogDataPoints,
  toDataPoint,
} from './analytics';
import type { LogEntry } from '@studyops/shared';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    ts: 1700000000000,
    level: 'info',
    source: 'server',
    event: 'study.created',
    message: 'test',
    env: 'dev',
    ...overrides,
  };
}

function makeAnalytics(): {
  analytics: AnalyticsEngineDataset;
  singleSpy: ReturnType<typeof vi.fn>;
} {
  const singleSpy = vi.fn();
  const analytics = {
    writeDataPoint: singleSpy,
  } as unknown as AnalyticsEngineDataset;
  return { analytics, singleSpy };
}

// ─── toDataPoint (매핑) ───────────────────────────────────────────────────
describe('toDataPoint', () => {
  it('필수 필드를 AE 슬롯에 매핑한다', () => {
    const entry = makeEntry({
      level: 'warn',
      source: 'client',
      env: 'production',
      path: '/admin/logs',
      method: 'GET',
      status: 404,
      userId: 42,
      durationMs: 120,
    });

    const dp = toDataPoint(entry);
    expect(dp.indexes).toEqual(['study.created']);
    expect(dp.blobs).toEqual([
      'warn',
      'client',
      'production',
      '/admin/logs',
      'GET',
      '404',
      '42',
    ]);
    expect(dp.doubles).toEqual([30, 120, 404, 1]);
  });

  it('userId가 null이면 blob7은 빈 문자열', () => {
    const dp = toDataPoint(makeEntry({ userId: null }));
    expect(dp.blobs[6]).toBe('');
  });

  it('userId가 undefined도 빈 문자열', () => {
    const dp = toDataPoint(makeEntry());
    expect(dp.blobs[6]).toBe('');
  });

  it('status가 undefined면 blob6은 빈 문자열, double3은 0', () => {
    const dp = toDataPoint(makeEntry({ status: undefined }));
    expect(dp.blobs[5]).toBe('');
    expect(dp.doubles[2]).toBe(0);
  });

  it('path/method 생략시 빈 문자열 슬롯 유지 (AE는 슬롯 순서 고정)', () => {
    const dp = toDataPoint(makeEntry({ path: undefined, method: undefined }));
    expect(dp.blobs[3]).toBe('');
    expect(dp.blobs[4]).toBe('');
  });

  it('env 생략시 기본 dev', () => {
    const dp = toDataPoint(makeEntry({ env: undefined }));
    expect(dp.blobs[2]).toBe('dev');
  });

  it('double4는 항상 1 (count weight — SUM(_sample_interval * 1) = 보정 count)', () => {
    const dp = toDataPoint(makeEntry({ level: 'fatal' }));
    expect(dp.doubles[3]).toBe(1);
  });

  it('fatal 레벨 가중치 50 반영', () => {
    const dp = toDataPoint(makeEntry({ level: 'fatal' }));
    expect(dp.doubles[0]).toBe(50);
  });

  it('blob 슬롯은 정확히 7개 (예약 슬롯은 AE가 허용하는 한)', () => {
    const dp = toDataPoint(makeEntry());
    expect(dp.blobs).toHaveLength(7);
  });

  it('double 슬롯은 정확히 4개', () => {
    const dp = toDataPoint(makeEntry());
    expect(dp.doubles).toHaveLength(4);
  });

  it('index는 정확히 1개 (AE 제약)', () => {
    const dp = toDataPoint(makeEntry());
    expect(dp.indexes).toHaveLength(1);
  });
});

// ─── writeLogDataPoint (단일) ──────────────────────────────────────────────
describe('writeLogDataPoint', () => {
  it('writeDataPoint를 한 번 호출한다', () => {
    const { analytics, singleSpy } = makeAnalytics();
    writeLogDataPoint(analytics, makeEntry());
    expect(singleSpy).toHaveBeenCalledTimes(1);
    expect(singleSpy).toHaveBeenCalledWith(expect.objectContaining({
      indexes: ['study.created'],
    }));
  });

  it('AE write가 throw해도 caller에 전파하지 않는다 (best-effort)', () => {
    const { analytics, singleSpy } = makeAnalytics();
    singleSpy.mockImplementation(() => {
      throw new Error('AE unavailable');
    });
    expect(() => writeLogDataPoint(analytics, makeEntry())).not.toThrow();
  });
});

// ─── writeLogDataPoints (복수, 내부 루프) ──────────────────────────────────
// AE 런타임은 writeDataPoint(단수)만 지원. writeLogDataPoints는 내부 루프.
describe('writeLogDataPoints', () => {
  it('빈 배열은 writeDataPoint를 호출하지 않는다', () => {
    const { analytics, singleSpy } = makeAnalytics();
    writeLogDataPoints(analytics, []);
    expect(singleSpy).not.toHaveBeenCalled();
  });

  it('각 entry마다 writeDataPoint를 1회씩 호출한다', () => {
    const { analytics, singleSpy } = makeAnalytics();
    const entries = Array.from({ length: 100 }, (_, i) => makeEntry({ ts: i }));
    writeLogDataPoints(analytics, entries);
    expect(singleSpy).toHaveBeenCalledTimes(100);
  });

  it('대량 배치(600개)도 모두 writeDataPoint로 전송된다', () => {
    const { analytics, singleSpy } = makeAnalytics();
    const entries = Array.from({ length: 600 }, (_, i) => makeEntry({ ts: i }));
    writeLogDataPoints(analytics, entries);
    expect(singleSpy).toHaveBeenCalledTimes(600);
  });

  it('AE write가 throw해도 caller에 전파하지 않는다', () => {
    const { analytics, singleSpy } = makeAnalytics();
    singleSpy.mockImplementation(() => {
      throw new Error('AE unavailable');
    });
    expect(() => writeLogDataPoints(analytics, [makeEntry(), makeEntry()])).not.toThrow();
  });
});
