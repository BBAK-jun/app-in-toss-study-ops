// Shared Kernel — 여러 bounded context가 공유하는 보편적 원시값.
// StudyId/ParticipantId 는 Study 가 소유하지만 Round 가 ID로 참조하므로,
// 컨텍스트 간 순환 의존을 피해 공유 커널에 둔다. EpochMs/UserKey 도 보편적.
import { Schema } from 'effect';

const uuid = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
);

export const StudyId = uuid.pipe(Schema.brand('StudyId'));
export const ParticipantId = uuid.pipe(Schema.brand('ParticipantId'));
export type StudyId = Schema.Schema.Type<typeof StudyId>;
export type ParticipantId = Schema.Schema.Type<typeof ParticipantId>;

export const UserKey = Schema.Number.pipe(Schema.int()).pipe(Schema.brand('UserKey'));
export type UserKey = Schema.Schema.Type<typeof UserKey>;

export const EpochMs = Schema.Number.pipe(Schema.brand('EpochMs'));
export type EpochMs = Schema.Schema.Type<typeof EpochMs>;
