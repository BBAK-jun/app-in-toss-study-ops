import type { StudyUnitOfWork } from '../application/ports';
import { DrizzleStudyRepository } from './study-repository.drizzle';
import { DrizzleParticipantRepository } from './participant-repository.drizzle';

// Study 컨텍스트 트랜잭션 경계. D1 은 대화형 tx 미지원 → 논리 트랜잭션, 다중 쓰기는 batch().
export class D1StudyUnitOfWork implements StudyUnitOfWork {
  readonly studies: DrizzleStudyRepository;
  readonly participants: DrizzleParticipantRepository;

  constructor(private db: D1Database) {
    this.studies = new DrizzleStudyRepository(db);
    this.participants = new DrizzleParticipantRepository(db);
  }

  async run<T>(work: (tx: this) => Promise<T>): Promise<T> {
    return work(this);
  }
}
