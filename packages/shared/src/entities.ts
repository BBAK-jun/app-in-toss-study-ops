// DB 엔티티 원형 — apps/server/src/db/schema.ts 의 Drizzle 테이블과 1:1 대응.
// 타임스탬프는 모두 epoch milliseconds (number). userKey만 number PK, 나머지 id는 uuid(string).

// ─── users ────────────────────────────────────────────────────────────────
// userKey: Toss login-me 앱 단위 식별자. 매 로그인마다 upsert.
export interface User {
  userKey: number;            // PK, integer
  displayName: string;        // 노출용 이름 (login-me name이 암호화됨 → 기본값/입력값)
  createdAt: number;          // epoch ms
}

// ─── studies ──────────────────────────────────────────────────────────────
export interface Study {
  id: string;                 // uuid, PK
  ownerId: number;            // FK → users.userKey
  title: string;
  description: string | null;
  discordWebhookUrl: string | null;  // PATCH로 설정/삭제 가능
  createdAt: number;          // epoch ms
}

// ─── rounds ───────────────────────────────────────────────────────────────
export interface Round {
  id: string;                 // uuid, PK
  studyId: string;            // FK → studies.id
  roundNumber: number;        // 1, 2, 3...
  title: string;
  dueAt: number | null;       // epoch ms, nullable
  createdAt: number;          // epoch ms
}

// ─── participants ─────────────────────────────────────────────────────────
// 스터디 단위 등록 (회차별 아님). 회차 현황은 이 목록 기준.
export interface Participant {
  id: string;                 // uuid, PK
  studyId: string;            // FK → studies.id
  name: string;
  discordHandle: string | null;  // @handle 또는 username, 멘션용
  createdAt: number;          // epoch ms
}

// ─── submissions ──────────────────────────────────────────────────────────
// 회차당 참여자 1제출. UNIQUE(roundId, participantId).
export interface Submission {
  id: string;                 // uuid, PK
  roundId: string;            // FK → rounds.id
  participantId: string;      // FK → participants.id
  url: string;                // 글/PR/Issue/Notion URL
  note: string | null;        // 메모
  createdAt: number;          // epoch ms
}
