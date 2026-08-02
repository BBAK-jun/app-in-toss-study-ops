import { Option } from 'effect';
import type { Clock } from '../../shared/application/ports';
import type { Study, Participant } from './state';
import type { StudyEvent } from './events';
import type { StudyId, ParticipantId, UserKey, StudyTitle, Description, WebhookUrl } from './branded';

// 도메인은 시간/ID를 주입받는다 (Date.now/randomUUID 금지). Clock 은 공유 커널.
export interface StudyIds {
  studyId(): StudyId;
  participantId(): ParticipantId;
}

// ── 팩토리: Study 생성. title 은 branded(빈 문자열 불가) → 실패 불가. ──
export function createStudy(args: {
  ids: StudyIds;
  clock: Clock;
  ownerId: UserKey;
  title: StudyTitle;
  description: Option.Option<Description>;
}): { readonly study: Study; readonly events: readonly StudyEvent[] } {
  const id = args.ids.studyId();
  const at = args.clock.now();
  const study: Study = {
    id,
    ownerId: args.ownerId,
    title: args.title,
    description: args.description,
    discordWebhookUrl: Option.none(),
    createdAt: at,
  };
  return { study, events: [{ type: 'StudyCreated', studyId: id, ownerId: args.ownerId, at }] };
}

// PATCH 변경 — undefined 면 '변경 없음', None 이면 '값 비움', Some 면 '값 설정'.
export interface StudyChanges {
  readonly title?: StudyTitle;
  readonly description?: Option.Option<Description>;
  readonly discordWebhookUrl?: Option.Option<WebhookUrl>;
}

// 불변 갱신: 인자를 바꾸지 않고 새 Study 반환.
export function applyStudyUpdate(study: Study, changes: StudyChanges): Study {
  return {
    ...study,
    ...(changes.title !== undefined ? { title: changes.title } : {}),
    ...(changes.description !== undefined ? { description: changes.description } : {}),
    ...(changes.discordWebhookUrl !== undefined ? { discordWebhookUrl: changes.discordWebhookUrl } : {}),
  };
}

// ── 팩토리: Participant 생성. ──
export function createParticipant(args: {
  ids: StudyIds;
  clock: Clock;
  studyId: StudyId;
  name: string;
  discordHandle: Option.Option<string>;
}): { readonly participant: Participant; readonly events: readonly StudyEvent[] } {
  const id = args.ids.participantId();
  const at = args.clock.now();
  const participant: Participant = {
    id,
    studyId: args.studyId,
    name: args.name,
    discordHandle: args.discordHandle,
    createdAt: at,
  };
  return { participant, events: [{ type: 'ParticipantAdded', studyId: args.studyId, participantId: id, at }] };
}
