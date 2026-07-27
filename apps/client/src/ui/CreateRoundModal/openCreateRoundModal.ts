import { createElement } from 'react';
import { overlay } from 'overlay-kit';

import { CreateRoundModal, type CreateRoundModalResult } from './CreateRoundModal';

/**
 * 회차 생성 모달을 엽니다.
 * @returns 생성된 회차의 id, 또는 취소한 경우 null
 */
export function openCreateRoundModal(opts: {
  studyId: string;
  initialRoundNumber: number;
}): Promise<CreateRoundModalResult | null> {
  return overlay.openAsync<CreateRoundModalResult | null>((controllerProps) =>
    createElement(CreateRoundModal, {
      ...controllerProps,
      studyId: opts.studyId,
      initialRoundNumber: opts.initialRoundNumber,
    }),
  );
}
