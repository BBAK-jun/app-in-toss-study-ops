// 세션 JWT 발급/검증 (HS256). Web Crypto 기반인 hono/jwt의 sign/verify 사용.
// 만료 7일. payload 에 userKey(number) + exp(초) 포함.
import { sign, verify, decode } from 'hono/jwt';

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7일
const ALG = 'HS256' as const;

export async function issueSession(
  env: { SESSION_SECRET: string },
  userKey: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await sign(
    { userKey, iat: now, exp: now + SESSION_TTL_SECONDS },
    env.SESSION_SECRET,
    ALG,
  );
}

export async function verifySession(
  env: { SESSION_SECRET: string },
  token: string,
): Promise<{ userKey: number } | null> {
  try {
    const payload = await verify(token, env.SESSION_SECRET, ALG);
    const userKey = payload.userKey;
    if (typeof userKey !== 'number') return null;
    // hono/jwt verify 가 exp/iat 를 자동 검증(만료 시 throw)하지만, 안전망으로 추가 체크.
    const exp = payload.exp;
    if (typeof exp === 'number' && exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { userKey };
  } catch {
    return null;
  }
}

// decode 재export (필요 시 토큰 디코딩용)
export { decode };
