import { Schema } from 'effect';
import { StudyId, ParticipantId, StudyTitle, Description, WebhookUrl } from '../domain/branded';

export const StudyIdParam = Schema.Struct({ id: StudyId });
export const ParticipantIdParam = Schema.Struct({ pid: ParticipantId });

export const CreateStudyInput = Schema.Struct({
  title: StudyTitle,
  description: Schema.optional(Description),
});

// PATCH: 각 필드 undefined → 변경 없음 / null → 비움(None) / 값 → 설정(Some).
export const UpdateStudyInput = Schema.Struct({
  title: Schema.optional(StudyTitle),
  description: Schema.optional(Schema.NullOr(Description)),
  discordWebhookUrl: Schema.optional(Schema.NullOr(WebhookUrl)),
});

const ParticipantItem = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  discordHandle: Schema.optional(Schema.String),
});

// 단건({ name }) 또는 복수({ participants: [...] }) 모두 허용 — 기존 클라이언트 호환.
export const AddParticipantsInput = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  discordHandle: Schema.optional(Schema.String),
  participants: Schema.optional(Schema.Array(ParticipantItem)),
});
