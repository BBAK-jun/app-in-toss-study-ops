import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appLogin } from '@apps-in-toss/web-framework';
import { BottomCTA, Paragraph, Spacing } from '@toss/tds-mobile';

import { login } from '../api/auth';
import { setToken, ApiError } from '../api/client';
import { useSession } from '../hooks/useSession';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { authorizationCode, referrer } = await appLogin();
      const { sessionToken, user } = await login(authorizationCode, referrer);
      setToken(sessionToken);
      setUser(user);
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
    <>
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
    </>
  );
}
