import { createElement } from 'react';
import { overlay } from 'overlay-kit';

import { DiscordWebhookModal } from './DiscordWebhookModal';

/**
 * Discord webhook 설정 모달을 엽니다.
 * 모달이 닫히면 resolve 됩니다 (저장 성공/취소 모두 void).
 */
export function openDiscordWebhookModal(opts: {
  studyId: string;
  currentUrl?: string;
}): Promise<void> {
  return overlay.openAsync<void>((controllerProps) =>
    createElement(DiscordWebhookModal, {
      ...controllerProps,
      studyId: opts.studyId,
      currentUrl: opts.currentUrl,
    }),
  );
}
