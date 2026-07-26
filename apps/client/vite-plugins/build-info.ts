import type { Plugin } from 'vite';
import { randomUUID } from 'node:crypto';

export type AppEnv = 'local' | 'development' | 'live';

function resolveAppEnv(): AppEnv {
  const raw = process.env.VITE_APP_ENV;
  if (raw === 'local' || raw === 'development' || raw === 'live') return raw;
  return 'local';
}

export function buildInfoPlugin(): Plugin {
  const appEnv = resolveAppEnv();
  const buildId = randomUUID();
  const buildTime = new Date().toISOString();

  return {
    name: 'studyops:build-info',
    config() {
      return {
        define: {
          __APP_ENV__: JSON.stringify(appEnv),
          __BUILD_ID__: JSON.stringify(buildId),
          __BUILD_TIME__: JSON.stringify(buildTime),
        },
      };
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html: string) {
        const metaTags = [
          `    <meta name="x-app-env" content="${appEnv}" />`,
          `    <meta name="x-build-id" content="${buildId}" />`,
          `    <meta name="x-build-time" content="${buildTime}" />`,
        ].join('\n');

        return html.replace('    <meta name="theme-color"', `${metaTags}\n    <meta name="theme-color"`);
      },
    },
  };
}
