import type { StudyRepository, ParticipantRepository } from '../domain/repository';

// 공유 포트 재수출.
export type { Clock, Principal } from '../../shared/application/ports';
// 식별자 생성 포트는 도메인에 정의된 StudyIds 를 그대로 사용(중복 정의 지양).
export type { StudyIds } from '../domain/aggregate';

// Study 컨텍스트 트랜잭션 경계.
export interface StudyUnitOfWork {
  readonly studies: StudyRepository;
  readonly participants: ParticipantRepository;
  run<T>(work: (tx: this) => Promise<T>): Promise<T>;
}
