import type { Option } from 'effect';
import type { StudyId, ParticipantId, UserKey, EpochMs, StudyTitle, Description, WebhookUrl } from './branded';

// Study 는 정적 값 객체(상태머신 없음). 핵심은 ownerId — 모든 권한의 기준.
export interface Study {
  readonly id: StudyId;
  readonly ownerId: UserKey;
  readonly title: StudyTitle;
  readonly description: Option.Option<Description>;
  readonly discordWebhookUrl: Option.Option<WebhookUrl>;
  readonly createdAt: EpochMs;
}

// Participant 는 Study 에 속하는 자식 엔티티.
export interface Participant {
  readonly id: ParticipantId;
  readonly studyId: StudyId;
  readonly name: string;
  readonly discordHandle: Option.Option<string>;
  readonly createdAt: EpochMs;
}
