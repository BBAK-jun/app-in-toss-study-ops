// Shared application ports — 모든 컨텍스트가 공유하는 의존성 인터페이스.
import type { EpochMs, UserKey } from '../domain/branded';

// 시간 포트 — Date.now 는 인프라 구현체에만.
export interface Clock {
  now(): EpochMs;
}

// 인증 결과 — 모든 컨텍스트 use case 의 공통 입력.
export interface Principal {
  readonly userKey: UserKey;
}
