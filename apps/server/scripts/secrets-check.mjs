// secrets-check.mjs — 배포 전 필수 secrets 존재 검증 (Node ESM).
// GitHub Actions deploy.yml 에서 `pnpm secrets:check` 로 호출.
// wrangler secret list --env production 의 출력을 파싱해 필수 키 존재 여부 확인.
//
// 사용법:
//   node scripts/secrets-check.mjs            # dev (default env)
//   node scripts/secrets-check.mjs production # production env
//
// 실패 시 exit code 1 (배포 중단).

const targetEnv = process.argv[2] || 'dev';

// 환경별 필수 secrets.
// dev: .dev.vars 로 대체 가능 (wrangler dev 시 .dev.vars 자동 로딩).
// production: 반드시 wrangler secret put 으로 등록되어야 함.
const REQUIRED = {
  production: ['SESSION_SECRET'],
  dev: [],
};

const requiredSecrets = REQUIRED[targetEnv] ?? [];

if (requiredSecrets.length === 0) {
  console.log(`[secrets-check] env="${targetEnv}": no required secrets (uses .dev.vars).`);
  process.exit(0);
}

import { execSync } from 'node:child_process';

try {
  console.log(`[secrets-check] Checking required secrets for env="${targetEnv}"...`);

  const cmd = `wrangler secret list --env ${targetEnv} 2>/dev/null`;
  const stdout = execSync(cmd, { encoding: 'utf-8' });

  // wrangler secret list JSON output format:
  // [ { name: "SESSION_SECRET", type: "secret", ... }, ... ]
  let secrets;
  try {
    secrets = JSON.parse(stdout);
  } catch {
    // If output is not JSON (CLI table format), try extracting names
    console.error(`[secrets-check] Failed to parse wrangler output as JSON. Raw output:`);
    console.error(stdout);
    process.exit(1);
  }

  const presentNames = new Set(secrets.map((s) => s.name));
  const missing = requiredSecrets.filter((name) => !presentNames.has(name));

  if (missing.length > 0) {
    console.error(`[secrets-check] ❌ FAILED — Missing required secrets for env="${targetEnv}":`);
    for (const name of missing) {
      console.error(`   - ${name} (run: wrangler secret put ${name} --env ${targetEnv})`);
    }
    process.exit(1);
  }

  console.log(`[secrets-check] ✅ PASSED — All required secrets present for env="${targetEnv}".`);
  process.exit(0);
} catch (err) {
  console.error(`[secrets-check] ❌ FAILED — ${err.message}`);
  process.exit(1);
}
