// DB row → DTO 매퍼. studies.ts 와 rounds.ts 에 중복 정의되던 것을 단일 출처로 통합.
// 본문은 기존 정의와 byte-identical (출력 shape 불변, REST 컨트랙트 보존).
import type {
  StudyDto,
  RoundDto,
  ParticipantDto,
  SubmissionDto,
} from '@studyops/shared';
import { studies, rounds, participants, submissions } from '../db/schema';

export function toStudyDto(row: typeof studies.$inferSelect): StudyDto {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    discordWebhookUrl: row.discordWebhookUrl,
    createdAt: row.createdAt,
  };
}

export function toRoundDto(row: typeof rounds.$inferSelect): RoundDto {
  return {
    id: row.id,
    studyId: row.studyId,
    roundNumber: row.roundNumber,
    title: row.title,
    dueAt: row.dueAt,
    createdAt: row.createdAt,
  };
}

export function toParticipantDto(row: typeof participants.$inferSelect): ParticipantDto {
  return {
    id: row.id,
    studyId: row.studyId,
    name: row.name,
    discordHandle: row.discordHandle,
    createdAt: row.createdAt,
  };
}

export function toSubmissionDto(row: typeof submissions.$inferSelect): SubmissionDto {
  return {
    id: row.id,
    roundId: row.roundId,
    participantId: row.participantId,
    url: row.url,
    note: row.note,
    createdAt: row.createdAt,
  };
}
