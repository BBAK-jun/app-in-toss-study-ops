---
id: adr-007
title: dev/prod D1 인스턴스 분리 — 동일 스키마, 격리된 데이터
status: accepted
date: 2026-07-26
supersededBy: null
tags: [server, d1, database, dev-prod, isolation]
---

# ADR-007: dev/prod D1 인스턴스 분리 — 동일 스키마, 격리된 데이터

## Context

MVP 1차까지는 D1 인스턴스가 1개 (`studyops-db`, UUID `a0459919-...`)였다.
dev에서 `wrangler d1 execute` 로 테스트 데이터를 넣거나 `d1 migrations apply --remote`를
실행하면 그대로 프로덕션 데이터에 영향을 주었다.

배포 안정성을 위해서는 dev와 prod 간 데이터 완전 격리가 필요했다.

## Decision

**D1 인스턴스를 2개 운영한다 — 동일 스키마, 격리된 인스턴스.**

| 속성 | studyops-db-dev | studyops-db-prod |
|---|---|---|
| UUID | `a0459919-418c-4563-bf8b-162eeff0396e` | `ae6a0663-e1f8-4fe6-96d5-64c2b335c673` |
| 생성 | MVP 시점 (기존 DB, 이름만 변경) | 2026-07-26 (신규) |
| 용도 | 로컬 dev, preview | 프로덕션 |
| 백업 | 필요시 수동 | `scripts/db-backup-prod.sh` (주기 권장) |
| 마이그레이션 | `wrangler d1 migrations apply studyops-db-dev --remote` | `wrangler d1 migrations apply studyops-db-prod --remote --env production` |

### 결제 비용

D1은 무료 tier에서:
- 읽기 5백만 행/월
- 쓰기 1백만 행/월
- 스토리지 5GB (인스턴스 공유)

인스턴스가 2개여도 이 제한은 인스턴스별이 아니라 계정 단위로 합산되지 않는다 (각각 별도 제한).
MVP 트래픽에서 무료 tier를 벗어날 가능성은 낮다.

### 포장 이사 (무중단 마이그레이션)

D1에는 streaming restore가 없으므로, prod DB 초기 데이터가 필요하면
`wrangler d1 export studyops-db-dev --remote > dump.sql` 으로 dev 데이터를 내보낸 후
`wrangler d1 execute studyops-db-prod --remote --file dump.sql` 로 prod에 밀어 넣는다.
(단, dev에는 prod에 없는 테스트 데이터가 섞여 있을 수 있으므로 선택적 필터링 필요)

## Consequences

### 긍정
- dev에서 `d1 execute --remote` 해도 prod 데이터가 오염되지 않음
- dev에서 migration rollback/재시도가 자유로움
- `wrangler deploy --env production` 실수로 dev DB에 prod 마이그가 실행되지 않음

### 부정
- D1 무료 tier 스토리지가 인스턴스 2개로 분산 (5GB × 2 콰터는 아님 — 각각 5GB 제한)
- 마이그레이션 2번 실행 필요 (dev → prod) — workflow_dispatch migrate-prod.yml 에서 해결
- prod DB 스키마가 dev와 동기화되지 않는 기간이 발생 가능 (배포 프로세스로 관리)

## Alternatives Considered

### 단일 인스턴스 + env 프리픽스 테이블
- **장점**: 인스턴스 1개, 운영 단순
- **기각**: `CREATE TABLE dev_attendees` 같은 패턴은 코드를 오염시키고, `wrangler d1 execute` 실수 방지 불가

### Cloudflare D1 read-replication
- **장점**: prod는 읽기 복제본, dev는 primary
- **기각**: D1 read-replication은 2026년 7월 기준 아직 GA 아님. 오버엔지니어링

## References

- D1 create: `wrangler d1 create studyops-db-prod`
- Backup: `apps/server/scripts/db-backup-prod.sh`
- `wrangler.jsonc` env.production.d1_databases
