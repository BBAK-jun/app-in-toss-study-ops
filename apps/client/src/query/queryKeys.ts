// apps/client/src/query/queryKeys.ts
//
// 쿼리 키 팩토리 — TanStack Query 의 핵심 설계.
//
// 설계 원칙:
//   1. 계층적 구조 — 부모 키로 무효화하면 자식 키도 자동 무효화.
//      ['studies'] → ['studies', 'detail', id] → ['studies', 'detail', id, 'rounds']
//   2. 불변성 — 모든 반환값은 as const 로 타입 리터럴 보장.
//   3. 응집도 — 도메인별로 키를 묶어, 어느 mutation 이 어느 query 를 무효화해야 하는지 명확.
//
// 무효화 예:
//   스터디 수정     → studyKeys.detail(id) 무효화 (detail + rounds + participants 일괄 새로고침)
//   참여자 추가     → studyKeys.participants(studyId) 무효화
//   회차 생성       → studyKeys.rounds(studyId) + studyKeys.roundSummaries(studyId) 무효화
//   제출 등록       → roundKeys.status(roundId) + studyKeys.roundSummaries(studyId) 무효화
//   스터디 삭제     → studyKeys.all 무효화 (전체 목록 새로고침)

export const studyKeys = {
  // ['studies'] — 스터디 도메인 전체. 스터디 생성/삭제 시 전체 무효화.
  all: ['studies'] as const,

  // ['studies', 'list'] — 목록 조회. 필터가 추가될 수 있음.
  lists: () => [...studyKeys.all, 'list'] as const,
  list: (filters?: { search?: string }) => [...studyKeys.lists(), filters] as const,

  // ['studies', 'detail', studyId] — 단일 스터디 상세.
  // 이 키로 무효화하면 rounds, roundSummaries, participants 하위 쿼리도 모두 갱신.
  details: () => [...studyKeys.all, 'detail'] as const,
  detail: (studyId: string) => [...studyKeys.details(), studyId] as const,

  // ['studies', 'detail', studyId, 'rounds'] — 스터디 하위 회차 목록.
  rounds: (studyId: string) => [...studyKeys.detail(studyId), 'rounds'] as const,

  // ['studies', 'detail', studyId, 'roundSummaries'] — 회차별 제출률 요약.
  roundSummaries: (studyId: string) => [...studyKeys.detail(studyId), 'roundSummaries'] as const,

  // ['studies', 'detail', studyId, 'participants'] — 참여자 목록.
  participants: (studyId: string) => [...studyKeys.detail(studyId), 'participants'] as const,
} as const;

export const roundKeys = {
  // ['rounds'] — 회차 도메인 전체.
  all: ['rounds'] as const,

  // ['rounds', 'detail', roundId] — 단일 회차 상세.
  details: () => [...roundKeys.all, 'detail'] as const,
  detail: (roundId: string) => [...roundKeys.details(), roundId] as const,

  // ['rounds', 'detail', roundId, 'status'] — 회차 제출 현황.
  status: (roundId: string) => [...roundKeys.detail(roundId), 'status'] as const,

  // ['rounds', 'detail', roundId, 'submissions'] — 제출 목록.
  submissions: (roundId: string) => [...roundKeys.detail(roundId), 'submissions'] as const,
} as const;

export const logKeys = {
  // ['logs'] — 로그 도메인 전체.
  all: ['logs'] as const,

  // ['logs', 'list', query] — 필터+커서 기반 로그 목록.
  list: (query: {
    level?: string;
    source?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }) => [...logKeys.all, 'list', query] as const,
} as const;
