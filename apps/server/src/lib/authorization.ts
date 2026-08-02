// 도메인 인가 원시. db 조회/404는 라우트에 잔류시키고, 소유권 불일치만 403 로 단정화.
// 기존 studies.ts:64 / rounds.ts:70 인라인 검증과 byte-identical (status/code/message).
import { HttpError } from './http-error';

/**
 * userKey 가 해당 스터디의 소유자인지 단정.
 * 불일치 시 HttpError(403, 'FORBIDDEN', 'You do not own this study') throw.
 */
export function assertStudyOwner(ownerId: number, userKey: number): void {
  if (ownerId !== userKey) {
    throw new HttpError(403, 'FORBIDDEN', 'You do not own this study');
  }
}
