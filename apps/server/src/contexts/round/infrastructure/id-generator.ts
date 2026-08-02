import { Schema } from 'effect';
import type { IdGenerator } from '../application/ports';
import { RoundId, SubmissionId } from '../domain/branded';

// 식별자 생성 구현체 — crypto.randomUUID() 도 인프라에만.
export const cryptoIds: IdGenerator = {
  roundId: () => Schema.decodeSync(RoundId)(crypto.randomUUID()),
  submissionId: () => Schema.decodeSync(SubmissionId)(crypto.randomUUID()),
};
