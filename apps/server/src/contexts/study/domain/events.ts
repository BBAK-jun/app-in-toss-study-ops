import type { StudyId, ParticipantId, UserKey, EpochMs } from './branded';

export type StudyEvent =
  | { readonly type: 'StudyCreated'; readonly studyId: StudyId; readonly ownerId: UserKey; readonly at: EpochMs }
  | { readonly type: 'StudyUpdated'; readonly studyId: StudyId; readonly at: EpochMs }
  | { readonly type: 'ParticipantAdded'; readonly studyId: StudyId; readonly participantId: ParticipantId; readonly at: EpochMs }
  | { readonly type: 'ParticipantRemoved'; readonly studyId: StudyId; readonly participantId: ParticipantId; readonly at: EpochMs };
