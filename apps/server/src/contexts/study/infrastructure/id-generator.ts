import { Schema } from 'effect';
import type { StudyIds } from '../domain/aggregate';
import { StudyId, ParticipantId } from '../domain/branded';

export const studyCryptoIds: StudyIds = {
  studyId: () => Schema.decodeSync(StudyId)(crypto.randomUUID()),
  participantId: () => Schema.decodeSync(ParticipantId)(crypto.randomUUID()),
};
