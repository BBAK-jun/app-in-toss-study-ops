// 부팅 시 환경 설정 검증 (fail-fast). 프로덕션 환경에서 안전하지 않은 설정으로
// Worker가 실행되는 것을 방지한다. HARNESS §6.3 — auth 분기만 허용되지만,
// 시작 시점의 결정론적 검사는 비즈니스 로직 분기가 아니다 (ADR-006 참조).
//
// 검사 항목:
//  1. ENVIRONMENT=production 인데 TOSS_AUTH_MODE=dev → 인증 우회 방지
//  2. SESSION_SECRET 누락 또는 약한 키 (<32 chars) → JWT 서명 보호
//  3. ENVIRONMENT=production 인데 DB binding 이 dev UUID → D1 격리 검증 (ADR-007)
//
// AE(LOGS_ANALYTICS) 바인딩은 wrangler.jsonc에 의해 보장되므로 fail-fast 검사에서
// 제외. 대신 logBootInfo에 상태를 노출하여 가시성만 확보 (ADR-013 — AE writes는
// non-critical best-effort 메트릭이므로 누락시 Worker가 동작해야 함).
//
// 실패 시 즉시 throw — Worker는 부팅되지 않고 500 응답. wrangler tail 로 즉시 관측 가능.

import type { AppEnv } from './env';

const MIN_SESSION_SECRET_LENGTH = 32;

// dev UUID (a0459919...) — 절대 prod 환경에서 사용되면 안 됨. ADR-007 참조.
const DEV_DB_UUID = 'a0459919-418c-4563-bf8b-162eeff0396e';

interface BootViolation {
  code: string;
  message: string;
}

export function assertBootEnvironment(env: AppEnv['Bindings']): void {
  const violations: BootViolation[] = [];

  // 1. 프로덕션 + dev auth 조합 금지 — 인증 우회 방지
  if (env.ENVIRONMENT === 'production' && env.TOSS_AUTH_MODE === 'dev') {
    violations.push({
      code: 'PROD_WITH_DEV_AUTH',
      message:
        'ENVIRONMENT=production requires TOSS_AUTH_MODE=live. Current TOSS_AUTH_MODE=dev allows unauthenticated dev-<userKey> codes — forbidden in prod.',
    });
  }

  // 2. SESSION_SECRET 필수 + 강도
  if (!env.SESSION_SECRET) {
    violations.push({
      code: 'SESSION_SECRET_MISSING',
      message: 'SESSION_SECRET is not set. Required for HS256 JWT session signing.',
    });
  } else if (env.SESSION_SECRET.length < MIN_SESSION_SECRET_LENGTH) {
    violations.push({
      code: 'SESSION_SECRET_WEAK',
      message: `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters (got ${env.SESSION_SECRET.length}). Use \`wrangler secret put SESSION_SECRET --env production\`.`,
    });
  }

  // 3. MCP_API_TOKEN 필수 (prod) — /mcp 엔드포인트 인증. See ADR-010.
  if (env.ENVIRONMENT === 'production' && !env.MCP_API_TOKEN) {
    violations.push({
      code: 'MCP_API_TOKEN_MISSING',
      message:
        'MCP_API_TOKEN is not set. Required for /mcp endpoint authentication in production. See ADR-010.',
    });
  }

  // 4. 프로덕션에서 dev D1 바인딩 사용 금지 — DB 격리 강제
  // env.DB 자체로는 UUID를 노출하지 않으므로, wrangler.jsonc의 ENVIRONMENT=production
  // 매핑이 올바른 DB를 가리키는지는 배포 시 --env production 플래그로 보장된다.
  // 런타임에서는 ENVIRONMENT 값 자체가 신뢰 출처. (wrangler.jsonc 검증은 CI가 담당.)
  // — 추가 런타임 검사 불가 (D1Database 객체에서 UUID 추출 불가).

  if (violations.length > 0) {
    const summary = violations.map((v) => `${v.code}: ${v.message}`).join(' | ');
    // 구조화 로그 — observability 활성화 상태에서 wrangler tail 로 즉시 포착
    console.error(
      JSON.stringify({
        level: 'fatal',
        event: 'boot_check_failed',
        environment: env.ENVIRONMENT,
        violations,
      }),
    );
    throw new Error(`[boot-check] Refusing to start. ${summary}`);
  }
}

// 환경 정보 로깅 — 부팅 성공 시. 디버깅 편의.
export function logBootInfo(env: AppEnv['Bindings']): void {
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'worker_started',
      environment: env.ENVIRONMENT,
      authMode: env.TOSS_AUTH_MODE,
      tossApiBase: env.TOSS_API_BASE_URL,
      analyticsEngine: env.LOGS_ANALYTICS ? 'configured' : 'missing',
    }),
  );
}

// 빌드 타임 상수 — dev D1 UUID 참조. boot-check 문서용.
export const __DEV_DB_UUID = DEV_DB_UUID;
