import type { RoundId, ParticipantId, StudyId, UserKey } from './branded';

// 도메인 실패 = ADT. throw 하지 않고 Either 값으로 반환 → 호출자의 exhaustive 처리 강제.
// (handler 의 switch(e._tag) 는 새 변종 추가 시 컴파일 에러로 누락을 포착한다.)
export type RoundError =
  | { readonly _tag: 'RoundNotFound'; readonly roundId: RoundId }
  | { readonly _tag: 'RoundNotOpen'; readonly roundId: RoundId }
  | { readonly _tag: 'DuplicateSubmission'; readonly roundId: RoundId; readonly participantId: ParticipantId }
  | { readonly _tag: 'ParticipantNotInStudy'; readonly participantId: ParticipantId; readonly studyId: StudyId }
  | { readonly _tag: 'Forbidden'; readonly userKey: UserKey; readonly studyId: StudyId };

export type DomainError = RoundError;

// 타입 안전 생성자: 객체 리터럴의 _tag 가 string 으로 넓어지는 것을 막는다.
export const RoundErrors = {
  notFound: (roundId: RoundId): RoundError => ({ _tag: 'RoundNotFound', roundId }),
  notOpen: (roundId: RoundId): RoundError => ({ _tag: 'RoundNotOpen', roundId }),
  duplicate: (roundId: RoundId, participantId: ParticipantId): RoundError => ({
    _tag: 'DuplicateSubmission',
    roundId,
    participantId,
  }),
  notInStudy: (participantId: ParticipantId, studyId: StudyId): RoundError => ({
    _tag: 'ParticipantNotInStudy',
    participantId,
    studyId,
  }),
  forbidden: (userKey: UserKey, studyId: StudyId): RoundError => ({ _tag: 'Forbidden', userKey, studyId }),
};
