import { Schema } from 'effect';
import type { Clock } from '../application/ports';
import { EpochMs } from '../domain/branded';

// 시스템 Clock 구현체 — Date.now() 는 이 인프라 파일에만 존재.
// 도메인/application 은 Clock 포트를 통해 시간을 주입받는다.
export const systemClock: Clock = {
  now: () => Schema.decodeSync(EpochMs)(Date.now()),
};
