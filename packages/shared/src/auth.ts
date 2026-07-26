// 인증 관련 DTO (POST /auth/login, GET /auth/me, SessionUser)

// 현재 세션 사용자. userKey는 Toss 식별자(number).
export interface SessionUser {
  userKey: number;
  displayName: string;
}

// POST /auth/login Request
// authorizationCode: appLogin()에서 받은 1회성 코드 (유효 10분)
// referrer: appLogin() 결과 그대로 전달
export interface LoginRequest {
  authorizationCode: string;
  referrer: 'DEFAULT' | 'SANDBOX';
}

// POST /auth/login Response 200
// sessionToken: 자체 HS256 JWT (만료 7일)
export interface LoginResponse {
  sessionToken: string;
  user: SessionUser;
}
