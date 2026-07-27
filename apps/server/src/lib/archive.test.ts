import { describe, it, expect, vi } from 'vitest';
import {
  buildR2Key,
  serializeRowsToJsonl,
  archiveBatch,
  type LogArchiveRow,
} from './archive';

function makeRow(overrides: Partial<LogArchiveRow> = {}): LogArchiveRow {
  return {
    id: 1,
    ts: Date.parse('2026-07-27T10:00:00Z'),
    level: 'error',
    source: 'server',
    event: 'study.created',
    message: 'test message',
    userId: 42,
    sessionId: 'sess-abc',
    requestId: 'req-123',
    method: 'POST',
    path: '/studies',
    status: 201,
    durationMs: 50,
    context: '{"studyId":"s1"}',
    stack: null,
    env: 'production',
    version: '1.0.0',
    userAgent: 'Mozilla/5.0',
    ipHash: 'abc123',
    ...overrides,
  };
}

function mockR2(): {
  r2: R2Bucket;
  puts: { key: string; body: string }[];
} {
  const puts: { key: string; body: string }[] = [];
  const r2 = {
    put: vi.fn(async (key: string, body: string, _opts?: unknown) => {
      puts.push({ key, body });
    }),
  } as unknown as R2Bucket;
  return { r2, puts };
}

describe('buildR2Key', () => {
  it('UTC 기준 Hive partition 키를 생성한다', () => {
    const ts = Date.parse('2026-07-27T10:00:00Z');
    const key = buildR2Key(ts, 'error', 1);
    expect(key).toBe('year=2026/month=07/day=27/level=error/20260727-error-0001.jsonl');
  });

  it('batchSeq가 4자리 패딩된다', () => {
    const ts = Date.parse('2026-01-05T00:00:00Z');
    expect(buildR2Key(ts, 'debug', 5)).toContain('-0005.jsonl');
    expect(buildR2Key(ts, 'debug', 50)).toContain('-0050.jsonl');
    expect(buildR2Key(ts, 'debug', 500)).toContain('-0500.jsonl');
  });
});

describe('serializeRowsToJsonl', () => {
  it('각 행을 JSON 라인으로 직렬화한다', () => {
    const rows = [makeRow({ id: 1 }), makeRow({ id: 2, message: 'second' })];
    const jsonl = serializeRowsToJsonl(rows);
    const lines = jsonl.trim().split('\n');
    expect(lines).toHaveLength(2);

    const first = JSON.parse(lines[0]);
    expect(first.id).toBe(1);
    expect(first.message).toBe('test message');
  });

  it('context JSON 문자열을 중첩 객체로 파싱한다', () => {
    const rows = [makeRow({ context: '{"key":"value","n":42}' })];
    const jsonl = serializeRowsToJsonl(rows);
    const parsed = JSON.parse(jsonl.trim());
    expect(parsed.context).toEqual({ key: 'value', n: 42 });
  });

  it('파싱 불가능한 context는 _raw 필드로 보존한다', () => {
    const rows = [makeRow({ context: 'not-valid-json{' })];
    const jsonl = serializeRowsToJsonl(rows);
    const parsed = JSON.parse(jsonl.trim());
    expect(parsed.context).toEqual({ _raw: 'not-valid-json{' });
  });

  it('null context는 null로 유지한다', () => {
    const rows = [makeRow({ context: null })];
    const jsonl = serializeRowsToJsonl(rows);
    const parsed = JSON.parse(jsonl.trim());
    expect(parsed.context).toBeNull();
  });

  it('빈 배열은 빈 문자열을 반환한다', () => {
    expect(serializeRowsToJsonl([])).toBe('');
  });

  it('끝에 개행 문자가 있다', () => {
    const rows = [makeRow()];
    const jsonl = serializeRowsToJsonl(rows);
    expect(jsonl.endsWith('\n')).toBe(true);
  });
});

describe('archiveBatch', () => {
  it('R2 put을 호출하고 결과를 반환한다', async () => {
    const { r2, puts } = mockR2();
    const rows = [makeRow({ id: 1 }), makeRow({ id: 2 })];

    const result = await archiveBatch(r2, rows, 1);

    expect(puts).toHaveLength(1);
    expect(puts[0].key).toBe('year=2026/month=07/day=27/level=error/20260727-error-0001.jsonl');
    expect(result.rowCount).toBe(2);
    expect(result.byteSize).toBeGreaterThan(0);
  });

  it('여러 날에 걸친 행은 날짜별로 분리된다', async () => {
    const { r2, puts } = mockR2();
    const day1Ts = Date.parse('2026-07-25T10:00:00Z');
    const day2Ts = Date.parse('2026-07-26T10:00:00Z');
    const rows = [
      makeRow({ id: 1, ts: day1Ts }),
      makeRow({ id: 2, ts: day1Ts }),
      makeRow({ id: 3, ts: day2Ts }),
    ];

    const result = await archiveBatch(r2, rows, 1);

    expect(puts).toHaveLength(2);
    expect(puts[0].key).toContain('day=25');
    expect(puts[1].key).toContain('day=26');
    expect(result.rowCount).toBe(1);
  });

  it('contentType이 application/x-ndjson으로 설정된다', async () => {
    const { r2, puts } = mockR2();
    const putSpy = r2.put as ReturnType<typeof vi.fn>;
    await archiveBatch(r2, [makeRow()], 1);
    expect(putSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { httpMetadata: { contentType: 'application/x-ndjson' } },
    );
  });

  it('빈 행 배열은 에러를 던진다', async () => {
    const { r2 } = mockR2();
    await expect(archiveBatch(r2, [], 1)).rejects.toThrow('empty rows');
  });
});
