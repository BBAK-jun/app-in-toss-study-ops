export type AppEnv = 'local' | 'development' | 'live';

export const BUILD_INFO = {
  env: __APP_ENV__,
  buildId: __BUILD_ID__,
  buildTime: __BUILD_TIME__,
} as const;

export function isDevBuild(): boolean {
  return BUILD_INFO.env !== 'live';
}
