// apps/client/src/runtime/RuntimeEnvironment.tsx
// IoC 의 핵심 — "현재 코드가 어디서 돌고 있는가"를 추상화.
// PageFrame/GnbLayout 은 이 인터페이스에만 의존하고, 구체적 감지 로직은 Provider 가 주입한다.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getOperationalEnvironment, getPlatformOS } from '@apps-in-toss/web-framework';

export interface RuntimeEnvironment {
  /**
   * 토스 앱 WebView 안에서 실행 중인가?
   * true 면 호스트가 자체 GNB/앱바를 제공하므로, 우리 쪽 AppShell(Top/TopNavigation)은 생략한다.
   * production('toss') 과 sandbox('sandbox') 모두 WebView 안이므로 true.
   */
  readonly isHostApp: boolean;

  /**
   * 현재 운영 환경.
   * - 'toss': 실제 토스 앱에서 실행 중.
   * - 'sandbox': 샌드박스 앱(개발용)에서 실행 중.
   * - 'web': 일반 브라우저(로컬 개발 등).
   */
  readonly operationalEnvironment: 'toss' | 'sandbox' | 'web';

  /**
   * 호스트 디바이스 플랫폼. WebView 바깥(일반 브라우저)이면 null.
   */
  readonly platformOS: 'ios' | 'android' | null;

  /** 디버그/로깅용 식별자. */
  readonly platform: 'web' | 'apps-in-toss';
}

const WEB_FALLBACK: RuntimeEnvironment = {
  isHostApp: false,
  operationalEnvironment: 'web',
  platformOS: null,
  platform: 'web',
};

const RuntimeEnvironmentContext = createContext<RuntimeEnvironment>(WEB_FALLBACK);

interface ProviderProps {
  children: ReactNode;
  environment?: RuntimeEnvironment;
}

export function RuntimeEnvironmentProvider({ children, environment }: ProviderProps) {
  const value = useMemo<RuntimeEnvironment>(
    () => environment ?? detectAppsInTossRuntime(),
    [environment],
  );
  return (
    <RuntimeEnvironmentContext.Provider value={value}>{children}</RuntimeEnvironmentContext.Provider>
  );
}

export function useRuntimeEnvironment(): RuntimeEnvironment {
  return useContext(RuntimeEnvironmentContext);
}

/**
 * Apps-in-Toss WebView 런타임 감지.
 *
 * 공식 API 인 getOperationalEnvironment() 는 WebView 안에서만 동작한다.
 * 일반 브라우저에서 호출하면 bridge 가 없어 에러를 던지므로 try/cash 로 web 으로 폴백.
 * 반환값:
 *   - 'toss'     → 실제 토스 앱 WebView
 *   - 'sandbox'  → 샌드박스 앱 WebView (개발용, intoss://{appName} 딥링크로 진입)
 *   - 'web'      → 일반 브라우저 (bridge 호출 실패)
 *
 * platformOS 도 같이 얻을 수 있어 가져오되, bridge 가 준비되지 않은 시점에 호출하면
 * 에러를 던질 수 있어 개별적으로 try/cash 로 감싼다.
 */
export function detectAppsInTossRuntime(): RuntimeEnvironment {
  const operationalEnvironment = safeCall(() => getOperationalEnvironment());
  if (operationalEnvironment === null) return WEB_FALLBACK;

  return {
    isHostApp: true,
    operationalEnvironment,
    platformOS: safeCall(() => getPlatformOS()),
    platform: 'apps-in-toss',
  };
}

function safeCall<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}
