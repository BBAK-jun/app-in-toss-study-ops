import type { Option } from 'effect';
import type { Round, OpenRound } from './state';
import type { Submission } from './aggregate';
import type { RoundId } from './branded';

export interface RoundAggregate {
  readonly round: Round;
  readonly submissions: ReadonlyArray<Submission>;
}

// 구체적 RoundRepository (제네릭 Repository<T> 지양).
// 이 도메인에 실제로 필요한 연산만 드러난다. 구현(Drizzle)은 infrastructure 에 있다.
export interface RoundRepository {
  findById(id: RoundId): Promise<Option.Option<RoundAggregate>>;
  create(round: OpenRound): Promise<void>; // 새 회차 INSERT
  save(round: Round): Promise<void>; // 상태 전이(Open→Closed) 영속화
  addSubmission(submission: Submission): Promise<void>; // 제출 1건 삽입
}
