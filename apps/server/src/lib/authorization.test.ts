import { describe, it, expect } from 'vitest';
import { assertStudyOwner } from './authorization';
import { HttpError } from './http-error';

describe('assertStudyOwner', () => {
  it('userKey 가 ownerId 와 일치하면 no-op (throw 안 함)', () => {
    expect(() => assertStudyOwner(42, 42)).not.toThrow();
  });

  it('불일치 시 HttpError(403, FORBIDDEN, ...) — 기존 인라인 검증과 byte-identical', () => {
    let err: unknown;
    try {
      assertStudyOwner(42, 7);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(403);
    expect((err as HttpError).code).toBe('FORBIDDEN');
    expect((err as HttpError).message).toBe('You do not own this study');
  });

  it('둘 다 0 이어도 일치로 취급 (no-op)', () => {
    expect(() => assertStudyOwner(0, 0)).not.toThrow();
  });
});
