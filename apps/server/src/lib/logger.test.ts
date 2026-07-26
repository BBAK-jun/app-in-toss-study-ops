// logger.ts 순수 함수 단위 테스트.
// 서버 로거의 핵심 결정 로직: PII sanitize, 샘플링 결정.
// D1 INSERT / Discord webhook / ctx.waitUntil은 별도 integration 테스트가 필요.

import { describe, it, expect, vi } from 'vitest';
import {
  sanitizeContext,
  shouldSample,
  buildLogContext,
  insertLogBatch,
} from './logger';
import type { LogEntry } from '@studyops/shared';

// ─── sanitizeContext ───────────────────────────────────────────────────────
describe('sanitizeContext', () => {
  it('허용된 키는 그대로 통과시킨다', () => {
    const result = sanitizeContext({
      studyId: 's-1',
      roundId: 'r-1',
      ownerId: 42,
      title: '스터디',
    });
    expect(result).toEqual({
      studyId: 's-1',
      roundId: 'r-1',
      ownerId: 42,
      title: '스터디',
    });
  });

  it('허용되지 않은 키는 [REDACTED]로 치환한다', () => {
    const result = sanitizeContext({
      studyId: 's-1',
      email: 'user@example.com', // PII
      accessToken: 'abc123', // secret
    });
    expect(result).toEqual({
      studyId: 's-1',
      email: '[REDACTED]',
      accessToken: '[REDACTED]',
    });
  });

  it('허용된 부모 키의 중첩 객체는 재귀적으로 sanitize한다', () => {
    // "details" 같은 컨테이너 키가 화이트리스트에 있을 때만 내부 검사.
    // 허용되지 않은 키(예: meta)는 통째로 [REDACTED] — 더 안전.
    const result = sanitizeContext({
      studyId: 's-1',
      details: {
        ownerId: 42, // 허용
        ip: '1.2.3.4', // 차단
      },
    });
    expect(result).toEqual({
      studyId: 's-1',
      details: {
        ownerId: 42,
        ip: '[REDACTED]',
      },
    });
  });

  it('허용되지 않은 부모 키는 통째로 [REDACTED] (재귀 X, 안전 우선)', () => {
    const result = sanitizeContext({
      studyId: 's-1',
      meta: {
        ownerId: 42,
        ip: '1.2.3.4',
      },
    });
    expect(result).toEqual({
      studyId: 's-1',
      meta: '[REDACTED]',
    });
  });

  it('배열은 그대로 통과시킨다 (배열 내부는 sanitize하지 않음)', () => {
    const result = sanitizeContext({
      notSubmittedHandles: ['@alice', '@bob'],
      // notSubmittedHandles 자체는 허용 키, 배열 값은 그대로.
    });
    expect(result).toEqual({
      notSubmittedHandles: ['@alice', '@bob'],
    });
  });

  it('undefined 입력시 null 반환', () => {
    expect(sanitizeContext(undefined)).toBeNull();
  });

  it('null 입력시 null 반환', () => {
    expect(sanitizeContext(null as unknown as undefined)).toBeNull();
  });

  it('빈 객체는 빈 객체 반환', () => {
    expect(sanitizeContext({})).toEqual({});
  });
});

// ─── shouldSample ──────────────────────────────────────────────────────────
describe('shouldSample', () => {
  const baseEntry = {
    level: 'info' as const,
    event: 'study.created' as const,
    message: 'test',
    ts: 1700000000000,
    forceSample: false,
  };

  it('dev 환경에서는 항상 true', () => {
    expect(shouldSample({ ...baseEntry, level: 'debug' }, 'dev')).toBe(true);
    expect(shouldSample({ ...baseEntry, level: 'info' }, 'dev')).toBe(true);
  });

  it('forceSample=true면 prod에서도 항상 true', () => {
    expect(
      shouldSample({ ...baseEntry, level: 'info', forceSample: true }, 'production'),
    ).toBe(true);
  });

  it('prod에서 debug는 항상 false (샘플링 0%)', () => {
    expect(
      shouldSample({ ...baseEntry, level: 'debug' }, 'production'),
    ).toBe(false);
  });

  it('prod에서 warn/error/fatal은 항상 true (샘플링 100%)', () => {
    expect(shouldSample({ ...baseEntry, level: 'warn' }, 'production')).toBe(true);
    expect(shouldSample({ ...baseEntry, level: 'error' }, 'production')).toBe(true);
    expect(shouldSample({ ...baseEntry, level: 'fatal' }, 'production')).toBe(true);
  });

  it('prod에서 info는 결정론적 (같은 입력 = 같은 결과)', () => {
    const entry = { ...baseEntry, level: 'info' as const };
    const result1 = shouldSample(entry, 'production');
    const result2 = shouldSample(entry, 'production');
    expect(result1).toBe(result2);
  });

  it('prod에서 info는 약 10% 통과 (대량 샘플로 검증)', () => {
    let passed = 0;
    const total = 1000;
    for (let i = 0; i < total; i++) {
      if (
        shouldSample(
          { ...baseEntry, level: 'info', ts: baseEntry.ts + i },
          'production',
        )
      ) {
        passed++;
      }
    }
    // 10% ±5% 허용 (랜덤 변동)
    expect(passed).toBeGreaterThan(total * 0.05);
    expect(passed).toBeLessThan(total * 0.15);
  });
});

// ─── insertLogBatch ─────────────────────────────────────────────────────────
describe('insertLogBatch', () => {
  it('빈 배열은 호출하지 않는다', async () => {
    const db = { batch: () => Promise.resolve([]) } as unknown as D1Database;
    const spy = vi.fn();
    db.batch = spy;
    await insertLogBatch(db, []);
    expect(spy).not.toHaveBeenCalled();
  });

  it('엔트리 배열은 batch()로 한 번에 전송한다', async () => {
    const db = {} as D1Database;
    const batchSpy = vi.fn().mockResolvedValue([]);
    db.batch = batchSpy;
    db.prepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
    });

    const entries: LogEntry[] = [
      {
        ts: 1,
        level: 'info',
        source: 'server',
        event: 'study.created',
        message: 'a',
      },
      {
        ts: 2,
        level: 'warn',
        source: 'server',
        event: 'study.not_found',
        message: 'b',
      },
    ];
    await insertLogBatch(db, entries);
    expect(batchSpy).toHaveBeenCalledTimes(1);
    expect(batchSpy).toHaveBeenCalledWith(expect.any(Array));
  });
});

// ─── buildLogContext (Hono Context → LogContext 추출) ──────────────────────
describe('buildLogContext', () => {
  it('Hono Context에서 db, executionCtx, env, requestId, user를 추출한다', () => {
    const fakeContext = {
      env: {
        DB: {} as D1Database,
        ENVIRONMENT: 'production',
        DISCORD_WEBHOOK_DEFAULT: 'https://discord.com/...',
      },
      executionCtx: { waitUntil: () => {} } as unknown as ExecutionContext,
      get: (key: string) => {
        if (key === 'requestId') return 'req-123';
        if (key === 'user') return { userKey: 99 };
        return undefined;
      },
    };
    const ctx = buildLogContext(fakeContext as never);
    expect(ctx.env).toBe('production');
    expect(ctx.db).toBe(fakeContext.env.DB);
    expect(ctx.requestId).toBe('req-123');
    expect(ctx.user).toEqual({ userKey: 99 });
    expect(ctx.discordWebhookDefault).toBe('https://discord.com/...');
  });

  it('dev 환경 감지', () => {
    const fakeContext = {
      env: { DB: {}, ENVIRONMENT: 'dev' },
      executionCtx: {} as ExecutionContext,
      get: () => undefined,
    };
    const ctx = buildLogContext(fakeContext as never);
    expect(ctx.env).toBe('dev');
  });
});
