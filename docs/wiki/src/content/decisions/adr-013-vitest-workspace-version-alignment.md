---
id: adr-013
title: Vitest 워크스페이스 버전 정렬 — 루트 2.x 잔류 핀 제거
status: accepted
date: 2026-08-02
supersedes: null
supersedesBy: null
tags: [server, testing, deps, vitest, monorepo]
---

# ADR-013: Vitest 워크스페이스 버전 정렬 — 루트 2.x 잔류 핀 제거

## Context

ADR-012에서 `apps/server`에 `vitest ^4.1.10` + `@cloudflare/vitest-pool-workers`를 도입했다.
하지만 **루트 `package.json` devDependency에 ADR-012 이전의 `vitest ^2.1.9` 핀이 잔류**했다
(루트 `vitest.config.ts`는 ADR-012 이전 node-env 단위 테스트 시절 설정).

결과로 npm은 **vitest 메이저 2개를 동시에 해석**:
- 루트 `node_modules/vitest` → `2.1.9`
- `apps/server/node_modules/vitest` → `4.1.10`

`@cloudflare/vitest-pool-workers`는 루트 `node_modules`로 호이스팅되므로, 풀이 `import ... from 'vitest/...'`
로 해석하는 vitest는 **루트의 2.1.9**가 된다. 반면 서버 러너는 `4.1.10`을 사용한다.
→ 풀이 2.1.9 내부 API 모양으로 mocker registry를 만들고, 4.1.10 러너가 그 위에 `.getById()`를 호출하면서
**`TypeError: this.getMockerRegistry(...).getById is not a function`** 발생. 9개 테스트 파일 전부 크래시.

> 핵심: 이 오류는 **Node 버전과 무관**하다. Node 22 와 Node 24 양쪽에서 완전히 동일하게 재현됐다.
> vitest/vite/miniflare 바이너리는 정상 설치됐고, `@vitest/*` 서브패키지는 4.1.10으로 정렬돼 있었다.
> 원인은 오직 `vitest` 메인 패키지의 듀얼 인스턴스(2.1.9 vs 4.1.10).

## Decision

**루트 `package.json`의 `vitest` 핀을 `^2.1.9` → `^4.1.10`으로 정렬**한다.

```diff
   "devDependencies": {
     "fake-indexeddb": "^5.0.2",
     "typescript": "^5.6.0",
-    "vitest": "^2.1.9"
+    "vitest": "^4.1.10"
   }
```

새 의존성을 추가하지 않는다 — **잔류하던 버전 스큐를 제거**할 뿐. 워크스페이스 전체가
단일 `vitest@4.1.10` 인스턴스로 dedupe된다 (풀→vitest, 서버→vitest 모두 4.1.10, nested 서버 복사본 제거).

### 부수 결정 1: `@modelcontextprotocol/sdk` 1.29.0 정확 핀

`apps/server/package.json`의 `@modelcontextprotocol/sdk`를 `^1.29.0` → `1.29.0`(정확)으로 핀.
**이유**: SDK 1.30.0의 `McpServer.tool()` 제네릭이 `mcp/server.ts:37`에서
`TS2589 Type instantiation is excessively deep` 를 유발한다. 1.29.0에서는 발생하지 않는다.
향후 `npm install` 재해석 시 1.30.0으로 밀려 CI typecheck가 깨지는 것을 방지.

### 부수 결정 2: lockfile은 표적 업데이트만

`package-lock.json` 변경 시 **전면 `npm install` 재생성 금지** — 원본 lockfile의 정교한 해석
(mcp sdk 1.29.0, `@cfworker/json-schema` 옵션 peer, zod)을 보존해야 한다. 전면 재생성은
이 의존성들을 드리프트시켜 TS2589 / peer 해석 실패를 유발한다 (npm 10과 11이 각각 다르게 드리프트).

본 ADR의 lockfile은 **표적 명령**으로만 갱신한다:
```bash
npm install vitest@4.1.10 --package-lock-only   # vitest 트리만 갱신, 나머지 보존
```
검증: 갱신 후 `mcp sdk 1.29.0`·`@cfworker/json-schema` 존재·`typescript 5.9.3` 불변을 확인.

## Consequences

### 긍정
- `npm run test:server` 녹색 복구 — **80 passed (9 files)**, Node 22·24 양쪽에서 동일.
- 워크스페이스에 vitest 인스턴스 1개 → `node_modules` 축소(dedupe), 버전 스큐 원천 차단.
- HARNESS §4 rule 3("테스트 삭제 금지")의 전제(실행 가능한 테스트) 확보.

### 부정
- 없음. 루트 `vitest.config.ts`는 v4 API(`defineConfig` + `environment`/`setupFiles`/`coverage`)와 호환되어
  설정 변경 없이 동작. (다만 헤더 주석은 ADR-012 이전 상태를 설명하므로 다소 부정확 — 비기능적.)

### 중립
- 루트 devDependency 버전만 올라간다(2→4). devDependency라 Workers 배포 번들에 영향 0.

## Alternatives Considered

### `@cloudflare/vitest-pool-workers` 0.18.8 → 0.20.1 업그레이드
- **기각**: 0.20.1은 `miniflare 5.x-alpha` + `wrangler 4.118` + `zod 4.x`를 끌어와 블라스트 반경이 크다.
  근본 원인(루트 2.x 듀얼 인스턴스)을 해결하지 못하며, 알파 의존성 도입 리스크만 가중.

### npm `overrides`/`pnpm.overrides` 강제 핀
- **기각**: 증상은 우회 가능하나 원인(잔류 핀)을 남기므로 부채. 핀 정렬이 더 직접적.

### Node 버전 변경
- **기각**: 동일 오류가 Node 22/24 양쪽에서 재현 → Node이 원인이 아님. (이 ADR과 별개로
  Node 22→LTS 24 검토는 진행 중.)

## Verification

CI와 동일한 Node 22(npm 10) + 표적 lockfile 업데이트 상태:
```
npm ci             → exit 0 (lockfile 동기화 OK)
build:shared      → 0
typecheck          → 0  (TS2589 없음, mcp sdk 1.29.0 핀)
test:server        → Test Files 9 passed (9) · Tests 80 passed (80)
build              → 0
types:server       → 0
```
풀→vitest 해석 경로(`require.resolve('vitest/package.json', {paths:['@cloudflare/vitest-pool-workers']})`)

풀→vitest 해석 경로(`require.resolve('vitest/package.json', {paths:['@cloudflare/vitest-pool-workers']})`)
모두 `4.1.10`로 일치. nested `apps/server/node_modules/vitest` 제거 확인.

## References

- ADR-012 (테스트 인프라 도입 — 본 ADR이 그 잔류 버전을 정리)
- HARNESS §4 rule 7 (새 의존성/버전 변경 시 ADR)
- cloudflare/workers-sdk#11064 (vitest v4 pool 마이그레이션 — 본 이슈와는 별개지만 내부 API 의존성 맥락)
