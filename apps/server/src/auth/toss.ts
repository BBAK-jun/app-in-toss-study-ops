// Toss OAuth2 사용자 해석. dev/live 분기.
// dev: Toss API 스킵, 인가코드 "dev-<userKey>" 파싱(폴백 userKey=1).
// live: generate-token → accessToken → login-me → { userKey, name }.
import type { Bindings } from '../env';
import { HttpError } from '../lib/http-error';

export interface TossUserInfo {
  userKey: number;
  name?: string;
}

export async function resolveTossUser(
  env: Bindings,
  authorizationCode: string,
  referrer: 'DEFAULT' | 'SANDBOX',
): Promise<TossUserInfo> {
  if (env.TOSS_AUTH_MODE === 'dev') {
    const match = /^dev-(\d+)$/.exec(authorizationCode);
    const userKey = match ? Number(match[1]) : 1;
    return { userKey, name: '개발자' };
  }

  // live: 실제 Toss OAuth2 플로우
  const tokenRes = await fetch(
    `${env.TOSS_API_BASE_URL}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationCode, referrer }),
      // 프로덕션: mTLS 인증서 필요 (env에 cert/key 바인딩)
    },
  );
  if (!tokenRes.ok) {
    throw new HttpError(502, 'TOSS_AUTH_FAILED', `generate-token failed: ${tokenRes.status}`);
  }
  const tokenBody = (await tokenRes.json()) as { accessToken: string };

  const meRes = await fetch(
    `${env.TOSS_API_BASE_URL}/api-partner/v1/apps-in-toss/user/oauth2/login-me`,
    {
      headers: { Authorization: `Bearer ${tokenBody.accessToken}` },
    },
  );
  if (!meRes.ok) {
    throw new HttpError(502, 'TOSS_AUTH_FAILED', `login-me failed: ${meRes.status}`);
  }
  const me = (await meRes.json()) as { userKey: number; name?: string };
  return { userKey: me.userKey, name: me.name };
}
