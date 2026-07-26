---
id: adr-002
title: Toss OAuth2 인증의 dev/live 분기 정책 — 비즈니스 로직은 단일 경로
status: accepted
date: 2026-07-12
supersededBy: null
tags: [auth, toss, oauth2, dev-mode, security]
---

# ADR-002: Toss OAuth2 인증의 dev/live 분기 정책

## Context

Toss 앱인토스 OAuth2(`appLogin`)의 프로덕션 모드는 mTLS 인증서를 요구한다. 인증서 발급 절차가 무거워:

1. 로컬 개발 중에는 mTLS 없이 Toss API를 호출할 수 없다.
2. 인증 흐름이 막히면 비즈니스 로직(스터디/회차/제출/Discord) 개발이 전부 블로킹된다.
3. MVP 기간(7/12~7/15) 내에 mTLS 발급을 완료하기 어렵다.

반면, 인증 이후의 모든 비즈니스 로직은 dev/prod 환경에서 동일해야 한다. "dev에서는 작동하는데 prod에서는 다르다"는 디버깅 헬을 피해야 한다.

## Decision

`TOSS_AUTH_MODE` 환경변수 한 곳에서만 분기한다:

```
TOSS_AUTH_MODE=dev  → Toss API 호출 스킵, 인가코드 "dev-<userKey>" 파싱 (userKey 숫자 추출)
TOSS_AUTH_MODE=live → 실제 OAuth2 (generate-token → login-me, mTLS 필요)
```

**절대 원칙**: 분기는 `apps/server/src/auth/toss.ts`의 `resolveTossUser()` 내부에만 존재한다. 이 함수가 반환하는 `TossUserInfo { userKey, name }`을 받은 이후의 비즈니스 로직은 모드와 무관하게 동일하게 동작한다.

## Consequences

### 긍정
- 로컬 개발이 Toss 인프라 의존에서 해방
- 인증 로직만 분기 → dev에서 검증한 비즈니스 로직이 live에서 그대로 동작
- mTLS 인증서 발급을 8/5 데모 이후로 미룰 수 있음
- 단일 환경변수로 전환 → 운영 실수 위험 최소

### 부정
- dev 모드 인가코드 형식 (`dev-<userKey>`)을 팀원이 알아야 함 → 문서화 부담
- live 전환 시 mTLS 설정 + secret 등록 절차를 반드시 거쳐야 함 → 체크리스트 필요
- dev 모드에서는 userKey 충돌 가능성 (여러 개발자가 같은 userKey 사용) → D1 PK 위반

### 완화
- `.dev.vars.example`에 dev 모드 사용법 명시
- HARNESS.md §3.1 (스택 고정)에 `TOSS_AUTH_MODE` 문서화
- userKey 충돌 시 D1 `INSERT ... ON CONFLICT DO UPDATE` (upsert)로 해결 — 이미 구현됨

## Alternatives Considered

### 모킹 라이브러리 (MSW 등)
- 클라이언트 측은 모킹 가능하지만, 서버 측 mTLS를 우회하려면 결국 분기 필요.
- 복잡도만 증가하고 근본 해결이 안 됨.

### Toss 샌드박스 환경 사용
- Toss가 제공하는 샌드박스가 있을 수 있으나, 앱인토스 초기 단계에서는 문서화가 부족.
- 사용 가능하더라도 mTLS 인증서 없이는 접근 불가능할 가능성 큼.

## References

- `docs/ARCHITECTURE.md` §4-4 (인증 플로우 시퀀스), R1 (mTLS 없이 개발하는 방법)
- `apps/server/src/auth/toss.ts` — `resolveTossUser()` 구현
- `apps/server/.dev.vars.example` — 환경변수 템플릿
