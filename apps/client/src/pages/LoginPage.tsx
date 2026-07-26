import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appLogin } from '@apps-in-toss/web-framework';
import { BottomCTA, Paragraph, Spacing } from '@toss/tds-mobile';
import { AppShell } from '../components/AppShell';
import { login } from '../api/auth';
import { setToken } from '../api/client';
import { ApiError } from '../api/client';
import { useSession } from '../hooks/useSession';
import { APP_META } from '../constants';

// 로그인 화면(문서 4-5): appLogin() → /auth/login → 메인 이동.
export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      // 1. 토스 인증으로 인가코드 획득
      const { authorizationCode, referrer } = await appLogin();
      // 2. 서버에서 세션 토큰 발급
      const { sessionToken, user } = await login(authorizationCode, referrer);
      // 3. 토큰은 sessionStorage, user 는 메모리(문서 4-4)
      setToken(sessionToken);
      setUser(user);
      // 4. 메인으로 이동
      navigate('/', { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : '로그인에 실패했어요. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title={APP_META.displayName}>
      <div style={{ padding: '40px 24px' }}>
        <Paragraph typography="t2" fontWeight="bold">
          스터디 제출 현황을
          <br />
          한눈에 관리해요
        </Paragraph>
        <Spacing size={12} />
        <Paragraph typography="t5" color="#5B646B">
          토스로 로그인하면 스터디 회차별 제출률과 리마인드를 빠르게 보낼 수 있어요.
        </Paragraph>

        {error ? (
          <>
            <Spacing size={20} />
            <Paragraph typography="t6" color="#EF4444">
              {error}
            </Paragraph>
          </>
        ) : null}
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '0 16px env(safe-area-inset-bottom)' }}>
        <BottomCTA onClick={handleLogin} loading={loading} disabled={loading}>
          토스로 로그인하기
        </BottomCTA>
      </div>
    </AppShell>
  );
}
