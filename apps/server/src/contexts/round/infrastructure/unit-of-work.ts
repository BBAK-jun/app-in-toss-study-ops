import type { UnitOfWork } from '../application/ports';
import { DrizzleRoundRepository } from './round-repository.drizzle';

// D1 트랜잭션 경계.
// D1 은 대화형(BEGIN/COMMIT) 트랜잭션을 지원하지 않는다 — 단일 use case 범위를
// '논리 트랜잭션'으로 취급하고, 다중 쓰기가 필요한 시점에만 Drizzle 의 db.batch([...])
// 로 원자 flush 한다. (PostgreSQL 이었다면 여기서 실제 tx 를 열었을 것이다.)
export class D1UnitOfWork implements UnitOfWork {
  readonly rounds: DrizzleRoundRepository;

  constructor(private db: D1Database) {
    this.rounds = new DrizzleRoundRepository(db);
  }

  async run<T>(work: (tx: this) => Promise<T>): Promise<T> {
    return work(this);
  }
}
