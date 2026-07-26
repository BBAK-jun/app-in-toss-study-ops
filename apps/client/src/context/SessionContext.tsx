import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SessionUser } from '@studyops/shared';
import { getMe, login as apiLogin, logout as apiLogout } from '../api/auth';
import { clearToken, getToken, setToken } from '../api/client';

// 세션 관리(문서 4-4):
// - sessionToken → sessionStorage (앱/탱 생명주기). localStorage 절대 사용 금지(토스 정책).
// - user → 메모리(React Context) 전용. sessionStorage 캐시 안 함.
const SESSION_TOKEN_KEY = 'studyops_session';

interface SessionContextValue {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  loading: boolean;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  // 토큰이 있으면 세션 복구 중(최초 1회 getMe 호출)
  const [loading, setLoading] = useState<boolean>(() => {
    const token = getToken(SESSION_TOKEN_KEY);
    return token !== null || import.meta.env.DEV;
  });

  // 마운트 시 토큰이 있으면 서버에서 사용자 정보 복구. 실패하면 토큰 폐기.
  // UX 감사용 임시 DEV 자동로그인 — Orca 브라우저에서 풀 플로우 테스트. TODO: 감사 후 제거.
  useEffect(() => {
    const token = getToken(SESSION_TOKEN_KEY);
    let active = true;
    if (token) {
      getMe()
        .then((u) => active && setUser(u))
        .catch(() => { if (active) { clearToken(SESSION_TOKEN_KEY); setUser(null); } })
        .finally(() => active && setLoading(false));
    } else if (import.meta.env.DEV) {
      apiLogin('dev-1001', 'DEFAULT')
        .then(({ sessionToken, user }) => { if (!active) return; setToken(sessionToken); setUser(user); })
        .catch(() => {})
        .finally(() => active && setLoading(false));
    } else {
      setLoading(false);
    }
    return () => { active = false; };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      setUser,
      loading,
      logout: async () => {
        // 서버 로그아웃은 실패해도 클라이언트 토큰은 폐기(MVP stateless JWT).
        try {
          await apiLogout();
        } catch {
          // ignore
        } finally {
          clearToken(SESSION_TOKEN_KEY);
          setUser(null);
        }
      },
    }),
    [user, loading],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
