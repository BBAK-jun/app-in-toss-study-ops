import { Schema } from 'effect';
import { RoundId, ParticipantId, Url, RoundNumber, RoundTitle, EpochMs } from '../domain/branded';

// API 입력 스키마 = 디코딩 + branded 변환을 한 번에.
// handler 가 받는 값은 이미 branded 도메인 원시값 → 도메인/use case 에 그대로 넘긴다 (이중 검증 제거).
export const RoundIdParam = Schema.Struct({ id: RoundId });

export const CreateRoundInput = Schema.Struct({
  roundNumber: RoundNumber,
  title: RoundTitle,
  dueAt: Schema.optional(EpochMs),
});

export const SubmitToRoundInput = Schema.Struct({
  participantId: ParticipantId,
  url: Url,
  note: Schema.optional(Schema.String),
});

export const ShareDiscordInput = Schema.Struct({
  message: Schema.optional(Schema.String),
  webhookUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\//))),
});
