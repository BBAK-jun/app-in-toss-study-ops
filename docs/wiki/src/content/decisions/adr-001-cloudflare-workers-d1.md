---
id: adr-001
title: Cloudflare Workers + D1 + Hono를 서버 스택으로 채택
status: accepted
date: 2026-07-12
supersededBy: null
tags: [server, stack, cloudflare-workers, d1, hono]
---

# ADR-001: Cloudflare Workers + D1 + Hono를 서버 스택으로 채택

## Context

MVP 서버 요구사항:
- Toss OAuth2 (`appLogin`) 인증 처리
- 스터디/회차/참여자/제출 CRUD (관계형 데이터)
- Discord Webhook POST 호출
- 앱인토스 WebView에서 호출되는 JSON API
- 8/5 데모까지 작동하는 end-to-end 플로우

후보:
1. **Cloudflare Workers + D1 + Hono** — 서버리스, SQLite, 글로벌 엣지, 무료 tier 넉넉
2. Vercel + Postgres (Neon) + Next.js — 풀스택 프레임워크, 하지만 Vercel 종속
3. Supabase — 인증/DB/실시간 풀스택, 하지만 커스텀 비즈니스 로직 제약
4. Firebase — Google 종속, 한국에서 지연 이슈 가능

## Decision

**Cloudflare Workers + D1 (SQLite) + Hono**를 채택한다.

- 런타임: Cloudflare Workers (`compatibility_date = "2024-11-01"`, `nodejs_compat`)
- DB: D1 (SQLite 기반, 글로벌 읽기 복제)
- 프레임워크: Hono (경량, Web 표준, 미들웨어 패턴 단순)
- ORM: Drizzle ORM (D1 방언 지원, 타입 안전)
- 인증: 자체 HS256 JWT (Hono 내장 `hono/utils/jwt`, 7일 만료)

## Consequences

### 긍정
- 서버 비용 0원 (Workers 무료 tier: 100k 요청/일, D1 5GB)
- 배포 단순 (`wrangler deploy` 한 번)
- 로컬 개발 = 프로덕션 (Miniflare가 동일 런타임 시뮬레이션)
- 타입 안전성 — Drizzle + Hono + `packages/shared`로 end-to-end 타입 흐름
- 한국에서도 엣지 라운드 로빈으로 지연 최소 (Tokyo/Singapore PoP)

### 부정
- D1 제약 — SQLite 기반이라 풀텍스트 검색, JSON 연산 등 제한
- Workers 런타임 제약 — 30초 CPU 한도, Node.js API 일부 미지원
- mTLS 인증서 관리 — Toss live 모드 프로덕션에서 필요, 복잡도 증가
- 백업/마이그레이션 전략 — D1는 다른 RDS 대비 생태계 약함

### 중립
- Hono 학습 곡선 — Express와 비슷하지만 라우트 그룹 패턴이 다름
- Drizzle 학습 곡선 — Prisma와 다른 패러다임 (스키마 우선)

## Alternatives Considered

### Vercel + Neon Postgres
- **장점**: Next.js 풀스택, Vercel 인프라 신뢰도
- **단점**: 데이터베이스 egress 비용, Vercel 종속, Hono보다 무거움
- **기각 이유**: MVP 검증 단계에서 인프라 비용 최소화가 우선. Cloudflare 무료 tier가 압도적.

### Supabase
- **장점**: 인증/실시간/스토리지 통합, Postgres 풀기능
- **단점**: 커스텀 비즈니스 로직(리마인드 문구 생성, Discord Webhook 포맷)을 Edge Function으로 넣어야 하는데, 이게 Hono보다 덜 자유로움
- **기각 이유**: 인증은 이미 Toss OAuth2로 결정, Supabase 인증은 오버랩

## References

- `docs/ARCHITECTURE.md` §4-1 (디렉토리 구조), §4-2 (스키마), §4-3 (API 컨트랙트)
- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Hono docs: https://hono.dev/
- Drizzle ORM D1 docs: https://orm.drizzle.team/docs/get-started-sqlite
