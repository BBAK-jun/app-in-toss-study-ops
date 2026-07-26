import { describe, it, expect } from 'vitest';
import { buildLogsQuery, parseCursor, encodeCursor, clampLimit } from './logs-query';

describe('buildLogsQuery', () => {
  it('필터 없을 때 기본 쿼리 + 기본 limit 50', () => {
    const { sql, params } = buildLogsQuery({});
    expect(sql).toContain('SELECT');
    expect(sql).toContain('FROM logs');
    expect(sql).toContain('ORDER BY ts DESC, id DESC');
    expect(sql).toContain('LIMIT ?');
    expect(params).toHaveLength(1);
    expect(params[0]).toBe(50);
  });

  it('level 필터 추가', () => {
    const { sql, params } = buildLogsQuery({ level: 'error' });
    expect(sql).toContain('level = ?');
    expect(params[0]).toBe('error');
  });

  it('source 필터 추가', () => {
    const { sql, params } = buildLogsQuery({ source: 'client' });
    expect(sql).toContain('source = ?');
    expect(params[0]).toBe('client');
  });

  it('event 필터 추가', () => {
    const { sql, params } = buildLogsQuery({ event: 'client.page.view' });
    expect(sql).toContain('event = ?');
  });

  it('userId 필터 → user_id 컬럼', () => {
    const { sql, params } = buildLogsQuery({ userId: 42 });
    expect(sql).toContain('user_id = ?');
    expect(params).toContain(42);
  });

  it('requestId 필터 → request_id 컬럼', () => {
    const { sql } = buildLogsQuery({ requestId: 'req-123' });
    expect(sql).toContain('request_id = ?');
  });

  it('sessionId 필터 → session_id 컬럼', () => {
    const { sql } = buildLogsQuery({ sessionId: 'sess-1' });
    expect(sql).toContain('session_id = ?');
  });

  it('search 필터 → message LIKE', () => {
    const { sql, params } = buildLogsQuery({ search: 'boot' });
    expect(sql).toContain('message LIKE ?');
    expect(params).toContain('%boot%');
  });

  it('since 필터 → ts >=', () => {
    const { sql, params } = buildLogsQuery({ since: 1700000000000 });
    expect(sql).toContain('ts >= ?');
    expect(params).toContain(1700000000000);
  });

  it('until 필터 → ts <', () => {
    const { sql, params } = buildLogsQuery({ until: 1800000000000 });
    expect(sql).toContain('ts < ?');
    expect(params).toContain(1800000000000);
  });

  it('모든 필터 동시 적용', () => {
    const { sql, params } = buildLogsQuery({
      level: 'warn',
      source: 'server',
      userId: 7,
      search: 'timeout',
      since: 100,
      until: 200,
    });
    expect(sql).toContain('level = ?');
    expect(sql).toContain('source = ?');
    expect(sql).toContain('user_id = ?');
    expect(sql).toContain('message LIKE ?');
    expect(sql).toContain('ts >= ?');
    expect(sql).toContain('ts < ?');
    expect(params[params.length - 1]).toBe(50);
  });

  it('cursor 있을 때 커서 조건 추가', () => {
    const { sql, params } = buildLogsQuery({ cursor: '1700000000000:55' });
    expect(sql).toMatch(/ts < \? OR \(ts = \? AND id < \?\)/);
    expect(params[0]).toBe(1700000000000);
    expect(params[1]).toBe(1700000000000);
    expect(params[2]).toBe(55);
  });
});

describe('parseCursor / encodeCursor', () => {
  it('인코딩/디코딩 라운드트립', () => {
    const ts = 1700000000000;
    const id = 42;
    const encoded = encodeCursor(ts, id);
    const decoded = parseCursor(encoded);
    expect(decoded).toEqual({ ts, id });
  });

  it('잘못된 커서는 null 반환', () => {
    expect(parseCursor('not-a-cursor')).toBeNull();
    expect(parseCursor('abc:def')).toBeNull();
    expect(parseCursor('')).toBeNull();
    expect(parseCursor(undefined)).toBeNull();
  });
});

describe('clampLimit', () => {
  it('기본값 50', () => {
    expect(clampLimit(undefined)).toBe(50);
  });

  it('최대 200', () => {
    expect(clampLimit(500)).toBe(200);
  });

  it('최소 1', () => {
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(-5)).toBe(1);
  });

  it('정상값 그대로', () => {
    expect(clampLimit(25)).toBe(25);
    expect(clampLimit(100)).toBe(100);
  });
});
