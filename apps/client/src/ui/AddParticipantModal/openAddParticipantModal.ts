import { createElement } from 'react';
import { overlay } from 'overlay-kit';

import { AddParticipantModal } from './AddParticipantModal';

/**
 * 참여자 추가 모달을 엽니다.
 * 모달이 닫히면 resolve 됩니다 (추가 성공/취소 모두 void).
 */
export function openAddParticipantModal(studyId: string): Promise<void> {
  return overlay.openAsync<void>((controllerProps) =>
    createElement(AddParticipantModal, { ...controllerProps, studyId }),
  );
}
