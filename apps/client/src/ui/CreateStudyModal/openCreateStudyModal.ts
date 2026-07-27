import { overlay } from 'overlay-kit';

import { CreateStudyModal } from './CreateStudyModal';

/**
 * 스터디 생성 모달을 엽니다.
 * 모달이 닫히면 resolve 됩니다 (생성 성공/취소 모두 void).
 * 생성 결과는 useStudiesQuery 자동 invalidation 으로 목록에 반영됩니다.
 */
export function openCreateStudyModal(): Promise<void> {
  return overlay.openAsync<void>(CreateStudyModal);
}
