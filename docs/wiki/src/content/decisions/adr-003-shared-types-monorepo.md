---
id: adr-003
title: npm workspaces 모노레포 + @studyops/shared 공유 타입 패키지
status: accepted
date: 2026-07-12
supersededBy: null
tags: [monorepo, typescript, shared-types, architecture]
---

# ADR-003: npm workspaces 모노레포 + @studyops/shared 공유 타입 패키지

## Context

서버(Cloudflare Workers + Hono)와 클라이언트(React + Vite)는 동일한 도메인 모델(User, Study, Round, Participant, Submission)을 다룬다. API 응답/요청 DTO를 양쪽에서 각각 정의하면:

1. 스키마 변경 시 양쪽을 수동으로 동기화해야 함 → drift 위험
2. 타입 불일치로 인한 런타임 에러 (서버는 `user_key`, 클라는 `userKey` 등)
3. 코드 중복으로 인한 유지보수 비용 증가

후보:
1. **npm workspaces + 별도 패키지** — 단일 저장소, 타입만 공유
2. Turborepo / Nx — 빌드 오케스트레이션 포함
3. 단일 패키지 (모노리스) — 서버/클라이언트 한 코드베이스
4. 별도 저장소 + npm 패키지 게시 — 분리된 저장소

## Decision

**npm workspaces**에 **`packages/shared`** (`@studyops/shared`) 패키지를 둔다.

```
app-intoss-study-workspace/
├── package.json              # workspaces: ["packages/*", "apps/*"]
├── tsconfig.base.json        # @studyops/shared 경로 별칭
├── packages/
│   └── shared/               # @studyops/shared — 의존성 없음, 타입만 export
│       └── src/{entities,auth,studies,rounds,participants,submissions,errors}.ts
└── apps/
    ├── server/               # import { ... } from '@studyops/shared'
    └── client/               # 동일
```

**`packages/shared` 규칙**:
- 오직 타입(type/interface)만 export. 런타임 로직 금지.
- 의존성 없음 (`dependencies: {}`).
- `tsconfig.json`에 `"composite": true`로 project references 지원.

## Consequences

### 긍정
- 단일 저장소로 컨텍스트 스위치 최소
- DTO 변경 시 한 곳만 수정 → 양쪽에 자동 전파
- npm 게시 불필요 (workspace symlink로 해결)
- 타입 안전성 end-to-end 보장

### 부정
- 모든 클라이언트 빌드에 서버 타입 트리가 포함 → 빌드 시간 증가 (미미)
- shared 패키지가 커지면 분리 검토 필요
- 단일 저장소이므로 일부 변경이 전체에 영향

### 완화
- shared는 타입만 (런타임 코드 없음) → 트리셰이킹으로 번들에 미포함
- shared가 50개 파일 이상 넘어가면 도메인별 서브패키지 분리 검토

## Alternatives Considered

### Turborepo
- **장점**: 빌드 캐싱, 태스크 의존성 그래프, 원격 캐싱
- **단점**: 3개 패키지(shared/server/client) 규모에 오버스펙
- **기각 이유**: 빌드 캐싱 혜택이 작음. npm workspaces로 충분.

### 단일 패키지 (모노리스)
- **장점**: 설정 최소
- **단점**: 서버 전용 의존성(Hono, Drizzle)이 클라이언트 번들에 누출 위험
- **기각 이유**: 번들 사이즈/의존성 분리가 명확해야 함

## References

- `docs/ARCHITECTURE.md` §4-1 (모노레포 디렉토리 구조)
- `tsconfig.base.json` — `@studyops/shared` 경로 별칭
- `packages/shared/src/index.ts` — re-export 허브
