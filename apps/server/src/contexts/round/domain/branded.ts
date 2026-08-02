// Round 전용 branded 원시값 + 공유 커널 재수출.
// round 내부 파일들은 여전히 './branded' 에서 import → round-특정 타입과 공유 타입을 모두 얻는다.
import { Schema } from 'effect';

// 공유 커널(StudyId/ParticipantId/UserKey/EpochMs) 재수출.
export * from '../../shared/domain/branded';

const uuid = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
);

export const RoundId = uuid.pipe(Schema.brand('RoundId'));
export const SubmissionId = uuid.pipe(Schema.brand('SubmissionId'));
export type RoundId = Schema.Schema.Type<typeof RoundId>;
export type SubmissionId = Schema.Schema.Type<typeof SubmissionId>;

export const RoundNumber = Schema.Number.pipe(Schema.int())
  .pipe(Schema.greaterThanOrEqualTo(1))
  .pipe(Schema.brand('RoundNumber'));
export type RoundNumber = Schema.Schema.Type<typeof RoundNumber>;

export const RoundTitle = Schema.String.pipe(Schema.minLength(1)).pipe(Schema.brand('RoundTitle'));
export type RoundTitle = Schema.Schema.Type<typeof RoundTitle>;

export const Url = Schema.String.pipe(Schema.pattern(/^https?:\/\//)).pipe(Schema.brand('Url'));
export type Url = Schema.Schema.Type<typeof Url>;
