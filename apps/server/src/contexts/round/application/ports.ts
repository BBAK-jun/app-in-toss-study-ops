import type { Option } from 'effect';
import type { RoundRepository } from '../domain/repository';
import type { ParticipantInfo } from '../domain/aggregate';
import type { RoundId, SubmissionId, StudyId, ParticipantId, UserKey } from '../domain/branded';

// 공유 포트(Clock, Principal) 재수출 — round 파일들은 './ports' 에서 그대로 import.
export type { Clock, Principal } from '../../shared/application/ports';

// 식별자 생성 포트 — randomUUID 도 인프라에만.
export interface IdGenerator {
  roundId(): RoundId;
  submissionId(): SubmissionId;
}

// 트랜잭션 경계: run 안에서 읽고 쓴 변경이 원자적으로 flush 됨을 보장.
// (D1 구현체는 batch() 로 원자성을 제공한다.)
export interface UnitOfWork {
  readonly rounds: RoundRepository;
  run<T>(work: (tx: this) => Promise<T>): Promise<T>;
}

// 소유권/소속 '사실' 조회 포트 — IO 를 도메인 밖으로 빼낸다.
// 도메인은 이 포트가 돌려준 boolean/배열로만 불변식을 판단한다.
export interface StudyOwnershipService {
  isOwner(studyId: StudyId, userKey: UserKey): Promise<boolean>;
  participantBelongsToStudy(participantId: ParticipantId, studyId: StudyId): Promise<boolean>;
  participantsOf(studyId: StudyId): Promise<ReadonlyArray<ParticipantInfo>>;
  // study 에 설정된 Discord webhook URL 조회 — share-discord 폴백용. Study 데이터에 대한 ACL.
  webhookOf(studyId: StudyId): Promise<Option.Option<string>>;
}
