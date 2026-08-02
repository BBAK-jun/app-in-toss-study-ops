// @studyops/shared — 서버/클라이언트 공용 타입 re-export.
// 빌드 스텝 없이 이 파일을 직접 참조 (npm workspaces + package.json main/types).

export type * from './entities';
export type * from './auth';
export type * from './studies';
export type * from './rounds';
export type * from './participants';
export type * from './submissions';
export type * from './errors';

// logs.ts는 LOG_EVENTS 등 runtime const를 포함하므로 value export(`export *`) 사용.
// 다른 모듈은 타입 전용이라 `export type *`. ADR-011.
export * from './logs';

// domain/ — 순수 도메인 runtime 커널 (인프라 비의존). ADR-003 개정(8/3), logs.ts 선례.
export * from './domain/submission';
