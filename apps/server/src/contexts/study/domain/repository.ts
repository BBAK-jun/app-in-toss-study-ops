import type { Option } from 'effect';
import type { Study, Participant } from './state';
import type { StudyId, ParticipantId, UserKey } from './branded';

// 구체적 리포지토리(제네릭 지양). Study 와 Participant 는 별도 리포지토리.
export interface StudyRepository {
  findById(id: StudyId): Promise<Option.Option<Study>>;
  findByOwner(ownerId: UserKey): Promise<ReadonlyArray<Study>>;
  save(study: Study): Promise<void>; // 새 id 면 insert, 기존이면 update(upsert)
}

export interface ParticipantRepository {
  findByStudy(studyId: StudyId): Promise<ReadonlyArray<Participant>>;
  addMany(participants: ReadonlyArray<Participant>): Promise<void>;
  deleteById(participantId: ParticipantId): Promise<void>;
}
