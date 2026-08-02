import type { Option } from 'effect';
import type { RoundId, StudyId, RoundNumber, RoundTitle, EpochMs } from './branded';

// status: 'open' | 'closed' 문자열 필드 대신 '타입 자체'로 상태를 구분.
//  → "종료된 회차인데 closedAt이 없는" 상태를 컴파일러가 거부 (불가능 상태 = 표현 불가).
//  → OpenRound 에는 closedAt 필드 자체가 없고, ClosedRound 에는 항상 존재.
export interface OpenRound {
  readonly _tag: 'Open';
  readonly id: RoundId;
  readonly studyId: StudyId;
  readonly number: RoundNumber;
  readonly title: RoundTitle;
  readonly dueAt: Option.Option<EpochMs>; // 마감 미정 가능 → null 대신 Option
  readonly createdAt: EpochMs;
}

export interface ClosedRound {
  readonly _tag: 'Closed';
  readonly id: RoundId;
  readonly studyId: StudyId;
  readonly number: RoundNumber;
  readonly title: RoundTitle;
  readonly dueAt: Option.Option<EpochMs>;
  readonly closedAt: EpochMs; // 항상 존재 — Closed 상태에서만 의미
  readonly createdAt: EpochMs;
}

export type Round = OpenRound | ClosedRound;
