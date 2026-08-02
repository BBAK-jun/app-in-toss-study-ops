// import-from-github.ts — hanghae-story-forge 글쓰기 모임 GitHub Issue → D1 시드 SQL 생성.
//
// 목적:
//   GitHub Issue로 운영되던 과거 회차 히스토리를 StudyOps Bot D1 스키마로 변환.
//   archive(+ notification(repo 양쪽의 N회차 이슈와 댓글 제출물을 임포트한다.
//
// 매핑 요약 (상세는 코드 내 주석):
//   - Issue "N회차(시작일 ~ 종료일)"   → rounds 1행 (타이틀 매칭 안 되면 스킵)
//   - 같은 기간의 양 repo 중복         → comments 많은 쪽 채택
//   - round_number 리셋(1회차 재등장)  → 코호트(1기/2기/3기) 분리 → studies 분리
//   - Issue author                    → studies.owner_id (BBAK-jun 고정)
//   - Comment author                  → participants (login → /users API로 display_name 조회)
//   - Comment body 첫 URL             → submissions.url
//   - Comment body가 `>` 시작(인용)   → 리뷰 댓글로 간주, submissions에서 제외 (PRD 한계)
//   - ID                              → 결정론적 문자열 → INSERT OR REPLACE로 idempotent
//
// 사용법:
//   npx tsx apps/server/scripts/import-from-github.ts
//
// 출력:
//   apps/server/scripts/output/seed-writing-club.sql
//
// D1 적용:
//   # 로컬 dev DB
//   npx wrangler d1 execute studyops-db-dev --local \
//     --file=apps/server/scripts/output/seed-writing-club.sql
//   # 운영 DB (慎重)
//   npx wrangler d1 execute studyops-db-prod --remote \
//     --file=apps/server/scripts/output/seed-writing-club.sql
//
// 의존성: gh CLI (인증 완료), Node 18+ (Node:child_process, fetch). 별도 npm 패키지 불필요.

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Config ────────────────────────────────────────────────────────────────
const REPOS = ['hanghae-story-forge/archive', 'hanghae-story-forge/notification'];
const OWNER_LOGIN = 'BBAK-jun'; // 스터디 운영자 (issue 작성 패턴 기반)
const USER_KEY_BASE = 1001; // 글쓰기 모임 멤버에게 할당할 user_key 시작값 (dev-1001 등)
const NOTE_MAX_LEN = 500;

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(SCRIPT_DIR, 'output', 'seed-writing-club.sql');

// ─── Types ─────────────────────────────────────────────────────────────────
interface GhIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
  body: string | null;
  comments: number;
  user: { login: string };
  html_url: string;
  pull_request?: unknown;
}

interface GhComment {
  body: string;
  user: { login: string };
  created_at: string;
}

interface GhUser {
  login: string;
  name: string | null;
}

interface Round {
  repo: string;
  issueNumber: number;
  issueUrl: string;
  cohortIdx: number; // 0-based (0 = 1기)
  cohortRoundNumber: number; // 원제목 "N회차"의 N
  title: string;
  startEpochMs: number;
  endEpochMs: number;
  createdAtEpochMs: number;
  authorLogin: string;
  comments: GhComment[];
}

interface Submission {
  roundId: string;
  cohortIdx: number;
  participantLogin: string;
  url: string;
  note: string | null;
  createdAtEpochMs: number;
}

// ─── GitHub helpers ────────────────────────────────────────────────────────
function ghJson<T>(apiPath: string): T {
  // gh api 는 기본적으로 30 status 에서 non-zero exit. 큰 응답 대비 maxBuffer 상향.
  return JSON.parse(
    execSync(`gh api '${apiPath}'`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
}

function fetchAllIssues(repo: string): GhIssue[] {
  const all: GhIssue[] = [];
  // closed 먼저, 그 다음 open. PR은 pull_request 필드로 거른다.
  for (const state of ['closed', 'open'] as const) {
    const issues = ghJson<GhIssue[]>(
      `/repos/${repo}/issues?state=${state}&per_page=100`,
    );
    all.push(...issues.filter((i) => !i.pull_request));
  }
  // issue number 역순 중복 제거 (혹시 모를 edge case)
  const seen = new Set<number>();
  return all.filter((i) => {
    const key = i.number;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fetchComments(repo: string, issueNumber: number): GhComment[] {
  const all: GhComment[] = [];
  let page = 1;
  while (true) {
    const batch = ghJson<GhComment[]>(
      `/repos/${repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`,
    );
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return all;
}

function fetchUser(login: string): GhUser {
  try {
    return ghJson<GhUser>(`/users/${login}`);
  } catch {
    return { login, name: null };
  }
}

// ─── Parsing ───────────────────────────────────────────────────────────────
// 매칭 예:
//   1회차(9월 28일 ~ 10월 11일)        ← 구형 (앞자리 0 없음)
//   1회차(06월 08일 ~ 06월 21일)        ← 신형 (앞자리 0)
//   5회차(11월10일 ~ 11월 23일)         ← 스페이스 불균일
//   1회차（06월 08일 ~ 06월 21일）       ← 전각 괄호
// 비매칭 예: "항해 끝 ! 잠깐 방학"
const ROUND_TITLE_RE =
  /^(\d+)회차\s*[（(]\s*(\d{1,2})월\s*(\d{1,2})일\s*~\s*(\d{1,2})월\s*(\d{1,2})일\s*[)）]/;

interface ParsedRound {
  cohortRoundNumber: number;
  startEpochMs: number;
  endEpochMs: number;
}

function parseRound(issue: GhIssue): ParsedRound | null {
  const m = issue.title.match(ROUND_TITLE_RE);
  if (!m) return null;
  const [, numStr, sm, sd, em, ed] = m;
  const cohortRoundNumber = parseInt(numStr, 10);
  const startMonth = parseInt(sm, 10);
  const startDay = parseInt(sd, 10);
  const endMonth = parseInt(em, 10);
  const endDay = parseInt(ed, 10);

  // ── 연도 추론 ──
  // createdAt(ISO)에서 기본 연도를 뽑되, 이슈가 회차 시작 "한참 전"에 미리
  // 만들어진 경우를 보정한다. 예: 8회차(01월 05일) 이슈가 2025-10-26에 생성 →
  // 단순 createdAtYear=2025를 쓰면 startDate=2025-01-05가 돼서 1기 1회차(9월)보다
  // 앞으로 정렬되는 대참사가 발생.
  // 규칙: createdAt 연도로 시작일을 만들어 보고, 그것이 createdAt보다 30일 이상
  // 앞서면(= 회차 시작이 이슈 생성보다 30일+ 미래여야 하지만 반대로 너무 과거로
  // 떨어지면) 연도를 +1. 30일 grace는 약간의 retroactive 생성(회차 시작 며칠 후에
  // 이슈를 만든 경우)도 허용.
  const createdDate = new Date(issue.created_at);
  const createdYear = createdDate.getUTCFullYear();
  const GRACE_MS = 30 * 24 * 60 * 60 * 1000;

  let startYear = createdYear;
  const startDateSameYear = new Date(
    Date.UTC(createdYear, startMonth - 1, startDay),
  );
  if (startDateSameYear.getTime() < createdDate.getTime() - GRACE_MS) {
    startYear = createdYear + 1;
  }

  const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  // 마감일이 시작일보다 이전 월이면 연도 넘어감 (예: 12월 → 1월)
  let endYear = startYear;
  if (endMonth < startMonth) endYear = startYear + 1;
  // KST 자정 직전(23:59:59+09:00 = 14:59:59Z)을 마감 시각으로 사용
  const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 14, 59, 59));

  // 검증: 종료가 시작보다 선행하면 파싱 실패로 간주
  if (endDate.getTime() <= startDate.getTime()) return null;

  return {
    cohortRoundNumber,
    startEpochMs: startDate.getTime(),
    endEpochMs: endDate.getTime(),
  };
}

// 첫 번째 URL 추출. Markdown [text](url) 또는 naked URL.
function extractFirstUrl(body: string): string | null {
  const re = /\[[^\]]*\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)\]]+)/;
  const m = body.match(re);
  return m ? (m[1] ?? m[2] ?? null) : null;
}

// URL을 제거하고 의미 있는 텍스트만 note로 추출.
function extractNote(body: string, url: string): string | null {
  const cleaned = body
    .replace(url, '')
    .replace(/\[[^\]]*\]\(https?:\/\/[^\s)]+\)/g, '') // 다른 마크다운 링크 제거
    .replace(/https?:\/\/[^\s)\]]+/g, '') // 남은 naked URL 제거
    .replace(/^[>*_`~\s]+/gm, '') // 줄 단위 마크다운 기호 strip
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, NOTE_MAX_LEN) : null;
}

// 리뷰(인용) 댓글 판별: 본문이 `>` 로 시작하면 다른 제출물에 대한 리뷰로 간주.
function isReviewComment(body: string): boolean {
  return body.trimStart().startsWith('>');
}

// ─── SQL helpers ───────────────────────────────────────────────────────────
function sqlStr(s: string | null): string {
  if (s === null) return 'NULL';
  // SQLite 문자열: ' → '' 이스케이프. 개행/제어문자 그대로 허용.
  return "'" + s.replace(/'/g, "''") + "'";
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  // 1) 양 repo에서 이슈 전부 수집
  const allIssues: Array<{ repo: string; issue: GhIssue }> = [];
  for (const repo of REPOS) {
    console.error(`[${repo}] 이슈 fetch 중...`);
    const issues = fetchAllIssues(repo);
    console.error(`  → ${issues.length}건`);
    for (const issue of issues) allIssues.push({ repo, issue });
  }

  // 2) 회차 타이틀 파싱 (실패는 스킵)
  const parsed: Array<{
    repo: string;
    issue: GhIssue;
    parsed: ParsedRound;
  }> = [];
  for (const { repo, issue } of allIssues) {
    const p = parseRound(issue);
    if (p) parsed.push({ repo, issue, parsed: p });
  }
  console.error(`회차 파싱: ${parsed.length}건`);

  // 3) (start, end) 기준 dedupe — comments 많은 쪽 우선
  const byDate = new Map<
    string,
    (typeof parsed)[number]
  >();
  for (const item of parsed) {
    const key = `${item.parsed.startEpochMs}_${item.parsed.endEpochMs}`;
    const existing = byDate.get(key);
    if (!existing || item.issue.comments > existing.issue.comments) {
      byDate.set(key, item);
    }
  }
  console.error(`dedup 후 고유 회차: ${byDate.size}건`);

  // 4) 회차 시작일 기준 정렬 + "충돌 기반 코호트 분할"
  // 정렬은 startEpochMs로 (실제 회차 흐름 순서).
  // 코호트 감지: 같은 코호트에 같은 roundNumber가 이미 있거나, 이미 1회차가 있는
  // 코호트에 새 1회차가 들어오면 새 코호트로 분할.
  //   - 같은 roundNumber 충돌: 1기 2회차(10/12)가 이미 있는데 2회차(01/16, 긴 회차)가
  //     들어오면 새 코호트(2기)를 시작 → 긴 회차도 2기로 분류됨.
  //   - 1회차 재등장: 2기 1회차(02/02)가 들어와도 1기에 이미 1회차(9/28)가 있으므로
  //     새 코호트(2기)로 분리돼 있음 → 자연스럽게 1회차가 각 코호트에 1개씩.
  const sorted = [...byDate.values()].sort(
    (a, b) => a.parsed.startEpochMs - b.parsed.startEpochMs,
  );

  const rounds: Round[] = [];
  const seenInCohort: Set<number>[] = [];
  let cohortIdx = -1;
  for (const item of sorted) {
    const n = item.parsed.cohortRoundNumber;
    const needsNewCohort =
      cohortIdx === -1 ||
      (seenInCohort[cohortIdx].has(n)) ||
      (n === 1 && seenInCohort[cohortIdx].has(1));
    if (needsNewCohort) {
      cohortIdx++;
      seenInCohort[cohortIdx] = new Set([n]);
    } else {
      seenInCohort[cohortIdx].add(n);
    }
    rounds.push({
      repo: item.repo,
      issueNumber: item.issue.number,
      issueUrl: item.issue.html_url,
      cohortIdx,
      cohortRoundNumber: n,
      title: item.issue.title,
      startEpochMs: item.parsed.startEpochMs,
      endEpochMs: item.parsed.endEpochMs,
      createdAtEpochMs: new Date(item.issue.created_at).getTime(),
      authorLogin: item.issue.user.login,
      comments: [],
    });
  }
  const cohortCount = cohortIdx + 1;
  console.error(`코호트 분할: ${cohortCount}개 (1기~${cohortCount}기)`);

  // 5) 각 회차의 댓글 fetch
  let totalComments = 0;
  for (const r of rounds) {
    r.comments = fetchComments(r.repo, r.issueNumber);
    totalComments += r.comments.length;
  }
  console.error(`댓글 총합: ${totalComments}건`);

  // 6) submissions 추출
  const submissions: Submission[] = [];
  let skippedReviews = 0;
  let skippedNoUrl = 0;
  for (const r of rounds) {
    const roundId = `round_g${r.cohortIdx + 1}_${r.cohortRoundNumber}`;
    for (const c of r.comments) {
      const body = (c.body ?? '').trim();
      if (!body) continue;
      if (isReviewComment(body)) {
        skippedReviews++;
        continue;
      }
      const url = extractFirstUrl(body);
      if (!url) {
        skippedNoUrl++;
        continue;
      }
      submissions.push({
        roundId,
        cohortIdx: r.cohortIdx,
        participantLogin: c.user.login,
        url,
        note: extractNote(body, url),
        createdAtEpochMs: new Date(c.created_at).getTime(),
      });
    }
  }
  console.error(
    `submissions: ${submissions.length}건 (리뷰 스킵=${skippedReviews}, URL 없음 스킵=${skippedNoUrl})`,
  );

  // 7) 멤버 registry (login → user_key + display_name)
  const loginSet = new Set<string>();
  submissions.forEach((s) => loginSet.add(s.participantLogin));
  rounds.forEach((r) => loginSet.add(r.authorLogin));
  if (!loginSet.has(OWNER_LOGIN)) loginSet.add(OWNER_LOGIN);
  const logins = [...loginSet].sort();

  const userKeyMap = new Map<string, number>();
  const userDisplayName = new Map<string, string>();
  console.error(`멤버 display_name 조회 중 (${logins.length}명)...`);
  for (let i = 0; i < logins.length; i++) {
    const login = logins[i];
    userKeyMap.set(login, USER_KEY_BASE + i);
    const u = fetchUser(login);
    userDisplayName.set(login, u.name || login);
  }

  // 8) SQL 생성
  const sql: string[] = [];
  sql.push('-- ============================================================');
  sql.push('-- seed-writing-club.sql');
  sql.push('-- hanghae-story-forge 글쓰기 모임 GitHub Issue → D1 시드 데이터');
  sql.push(`-- 생성: ${new Date().toISOString()}`);
  sql.push(`-- 소스: ${REPOS.join(', ')}`);
  sql.push('--');
  sql.push('-- 적용 (로컬 dev DB):');
  sql.push('--   npx wrangler d1 execute studyops-db-dev --local \\');
  sql.push('--     --file=apps/server/scripts/output/seed-writing-club.sql');
  sql.push('--');
  sql.push('-- 재실행 안전: INSERT OR REPLACE. 결정론적 ID 사용.');
  sql.push('-- ============================================================');
  sql.push('');
  sql.push('-- wrangler d1 execute --file 이 자체적으로 트랜잭션을 잡으므로');
  sql.push('-- BEGIN/COMMIT 은 넣지 않는다 (nested transaction 방지).');
  sql.push('');

  // 8.1) users
  sql.push('-- ─── users ─────────────────────────────────────────────');
  sql.push('-- dev 모드에서는 인가코드 dev-<user_key>로 로그인 가능.');
  for (const login of logins) {
    const key = userKeyMap.get(login)!;
    const name = userDisplayName.get(login)!;
    sql.push(
      `INSERT OR REPLACE INTO users (user_key, display_name, created_at) VALUES (${key}, ${sqlStr(name)}, 0);`,
    );
  }
  sql.push('');

  // 8.2) studies (코호트별)
  sql.push('-- ─── studies ───────────────────────────────────────────');
  const ownerKey = userKeyMap.get(OWNER_LOGIN)!;
  for (let i = 0; i < cohortCount; i++) {
    const studyId = `study_writing_club_g${i + 1}`;
    const title = `글쓰기 모임 ${i + 1}기`;
    sql.push(
      `INSERT OR REPLACE INTO studies (id, owner_id, title, description, discord_webhook_url, created_at) VALUES`,
    );
    sql.push(
      `  (${sqlStr(studyId)}, ${ownerKey}, ${sqlStr(title)}, ${sqlStr('2주 단위로 글/이력서/산출물을 쓰고 서로 리뷰하는 개발자 글쓰기 모임')}, NULL, 0);`,
    );
  }
  sql.push('');

  // 8.3) participants — 코호트별로 별도 row 생성.
  // 같은 사람이 여러 코호트에 걸쳐 참여하므로 (study_id, login)마다 별도 row가 필요.
  // ID는 `part_g{cohort}_{login}`으로 study 단위 분리 (INSERT OR REPLACE 충돌 회피).
  // 단순화: 모든 코호트에 전체 멤버를 일단 등록. 실제로는 코호트별로 참여자가
  // 다를 수 있으니 운영자가 앱 UI에서 정제.
  sql.push('-- ─── participants ──────────────────────────────────────');
  for (let i = 0; i < cohortCount; i++) {
    const studyId = `study_writing_club_g${i + 1}`;
    for (const login of logins) {
      const partId = `part_g${i + 1}_${login}`;
      const name = userDisplayName.get(login)!;
      sql.push(
        `INSERT OR REPLACE INTO participants (id, study_id, name, discord_handle, created_at) VALUES`,
      );
      sql.push(
        `  (${sqlStr(partId)}, ${sqlStr(studyId)}, ${sqlStr(name)}, ${sqlStr(login)}, 0);`,
      );
    }
  }
  sql.push('');

  // 8.4) rounds
  sql.push('-- ─── rounds ────────────────────────────────────────────');
  for (const r of rounds) {
    const roundId = `round_g${r.cohortIdx + 1}_${r.cohortRoundNumber}`;
    const studyId = `study_writing_club_g${r.cohortIdx + 1}`;
    sql.push(`INSERT OR REPLACE INTO rounds (id, study_id, round_number, title, due_at, created_at) VALUES`);
    sql.push(
      `  (${sqlStr(roundId)}, ${sqlStr(studyId)}, ${r.cohortRoundNumber}, ${sqlStr(r.title)}, ${r.endEpochMs}, ${r.createdAtEpochMs});`,
    );
  }
  sql.push('');

  // 8.5) submissions — createdAt ASC로 정렬하여 같은 (roundId, participantId)는
  //      마지막 것이 INSERT OR REPLACE로 덮어쓰게 함 (업데이트 제출 반영).
  sql.push('-- ─── submissions ───────────────────────────────────────');
  sql.push('-- 같은 회차+참여자가 여러 번 제출한 경우 마지막 제출이 유효.');
  sql.push('-- (UNIQUE(round_id, participant_id) 제약 + OR REPLACE)');
  submissions.sort((a, b) => a.createdAtEpochMs - b.createdAtEpochMs);
  for (const s of submissions) {
    const partId = `part_g${s.cohortIdx + 1}_${s.participantLogin}`;
    const subId = `${s.roundId}__${s.participantLogin}`;
    sql.push(`INSERT OR REPLACE INTO submissions (id, round_id, participant_id, url, note, created_at) VALUES`);
    sql.push(
      `  (${sqlStr(subId)}, ${sqlStr(s.roundId)}, ${sqlStr(partId)}, ${sqlStr(s.url)}, ${sqlStr(s.note)}, ${s.createdAtEpochMs});`,
    );
  }
  sql.push('');

  sql.push('');

  // 부록: 통계 요약 (주석처리, 참고용)
  sql.push('-- ─── 통계 요약 ──────────────────────────────────────────');
  sql.push(`-- 코호트 수: ${cohortCount}`);
  sql.push(`-- 회차 수: ${rounds.length}`);
  sql.push(`-- 참여자 수: ${logins.length}`);
  sql.push(`-- 제출 수: ${submissions.length}`);
  sql.push(`-- 리뷰(인용) 댓글 스킵: ${skippedReviews}건 (PRD 한계: reviews 테이블 추가 시 보존 가능)`);
  sql.push(`-- URL 없는 댓글 스킵: ${skippedNoUrl}건`);
  sql.push('--');
  sql.push('-- 코호트별 회차 목록:');
  for (let i = 0; i < cohortCount; i++) {
    const cohortRounds = rounds.filter((r) => r.cohortIdx === i);
    sql.push(
      `--   ${i + 1}기 (${cohortRounds[0]?.title.split('(')[1]?.split('~')[0].trim() ?? ''} ~ ${cohortRounds[cohortRounds.length - 1]?.title.split('~')[1]?.split(')')[0].trim() ?? ''}): ${cohortRounds.length}회차`,
    );
  }
  sql.push('');
  sql.push('-- 멤버 목록 (login → user_key):');
  for (const login of logins) {
    sql.push(`--   ${login.padEnd(20)} → ${userKeyMap.get(login)} (${userDisplayName.get(login)})`);
  }

  // 9) 파일 출력
  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  writeFileSync(OUTPUT_FILE, sql.join('\n'));
  console.error(`\n✅ SQL 출력: ${OUTPUT_FILE}`);
  console.error(`   적용: npx wrangler d1 execute studyops-db-dev --local --file=${OUTPUT_FILE}`);
}

main().catch((e) => {
  console.error('❌ 실패:', e);
  process.exit(1);
});
