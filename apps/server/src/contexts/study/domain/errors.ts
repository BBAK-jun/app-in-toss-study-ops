import type { StudyId, ParticipantId, UserKey } from './branded';

export type StudyError =
  | { readonly _tag: 'StudyNotFound'; readonly studyId: StudyId }
  | { readonly _tag: 'Forbidden'; readonly userKey: UserKey; readonly studyId: StudyId }
  | { readonly _tag: 'ParticipantNotFound'; readonly participantId: ParticipantId };

export const StudyErrors = {
  notFound: (studyId: StudyId): StudyError => ({ _tag: 'StudyNotFound', studyId }),
  forbidden: (userKey: UserKey, studyId: StudyId): StudyError => ({ _tag: 'Forbidden', userKey, studyId }),
  participantNotFound: (participantId: ParticipantId): StudyError => ({
    _tag: 'ParticipantNotFound',
    participantId,
  }),
};
