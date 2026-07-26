import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appLogin } from '@apps-in-toss/web-framework';
import { BottomCTA, Paragraph, Spacing, TextField } from '@toss/tds-mobile';

import { login } from '../api/auth';
import { setToken, ApiError } from '../api/client';
import { useSession } from '../hooks/useSession';
import { APP_META } from '../constants';
import { isDevBuild, BUILD_INFO } from '../lib/build-info';
import { usePageLayout } from '../layout/PageLayoutContext';

type DevCodeInputEvent = React.ChangeEvent<HTMLInputElement>;

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [devCode, setDevCode] = useState('');

  usePageLayout({ title: APP_META.displayName });

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      let authorizationCode: string;
      let referrer: 'DEFAULT' | 'SANDBOX' = 'DEFAULT';

      if (isDevBuild() && devCode) {
        authorizationCode = devCode;
      } else {
        const authResult = await appLogin();
        authorizationCode = authResult.authorizationCode;
        referrer = authResult.referrer;
      }

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

  const isDevCodeValid = devCode.startsWith('dev-') && devCode.length > 4;

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

        {isDevBuild() && (
          <>
            <Spacing size={24} />
            <div style={{ backgroundColor: '#F6F7F8', padding: '16px', borderRadius: '12px' }}>
              <Paragraph typography="t6" fontWeight="bold" color="#5B646B">
                🔧 개발자 모드 ({BUILD_INFO.env})
              </Paragraph>
              <Spacing size={8} />
              <Paragraph typography="t7" color="#7D858C">
                인가코드 형식: <code style={{ backgroundColor: '#E8EBED', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>dev-{`<userKey>`}</code>
                <br />
                예: <code style={{ backgroundColor: '#E8EBED', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>dev-42</code>, <code style={{ backgroundColor: '#E8EBED', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>dev-999</code>
              </Paragraph>
              <Spacing size={12} />
              <TextField
                variant="line"
                placeholder="dev-42"
                value={devCode}
                onChange={(e: DevCodeInputEvent) => setDevCode(e.target.value)}
                disabled={loading}
              />
            </div>
          </>
        )}

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
        <BottomCTA
          onClick={handleLogin}
          loading={loading}
          disabled={loading || (isDevBuild() && !isDevCodeValid)}
        >
          {isDevBuild() ? '로그인하기 (개발 모드)' : '토스로 로그인하기'}
        </BottomCTA>
      </div>
    </>
  );
}
