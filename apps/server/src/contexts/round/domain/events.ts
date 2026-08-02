import type { RoundId, StudyId, ParticipantId, SubmissionId, EpochMs } from './branded';

// 도메인 이벤트: 순수 도메인 함수가 '발생시키되' 발행(publish)은 애플리케이션 계층의 책임.
// 도메인 함수는 [새 상태, 이벤트] 를 반환하고, 애플리케이션이 outbox/eventBus 로 보낸다.
export type RoundEvent =
  | { readonly type: 'RoundOpened'; readonly roundId: RoundId; readonly studyId: StudyId; readonly at: EpochMs }
  | { readonly type: 'RoundClosed'; readonly roundId: RoundId; readonly at: EpochMs }
  | {
      readonly type: 'SubmissionAccepted';
      readonly roundId: RoundId;
      readonly submissionId: SubmissionId;
      readonly participantId: ParticipantId;
      readonly at: EpochMs;
    };
